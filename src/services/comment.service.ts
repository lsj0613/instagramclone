import "server-only";

import db from "@/lib/db";
import { comments, commentLikes } from "@/db/schema";
import { and, desc, eq, isNull, sql, lt } from "drizzle-orm";

// ⭐️ [수정] revalidate 관련 import 모두 제거. 오직 DB 작업만 수행.

// 1. 댓글 생성
export async function createComment({
  postId,
  authorId,
  content,
  parentId,
}: {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
}) {
  return await db.transaction(async (tx) => {
    const [newComment] = await tx
      .insert(comments)
      .values({
        postId,
        authorId,
        content,
        parentId: parentId || null,
      })
      .returning();

    if (!newComment) throw new Error("Failed to create comment");

    // ⭐️ 캐시 무효화 로직 삭제됨 (순수성 유지)
    return newComment;
  });
}

// 2. 댓글 삭제
export async function deleteComment({
  commentId,
  userId,
}: {
  commentId: string;
  userId: string;
}) {
  const [deletedComment] = await db
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)))
    .returning();

  if (!deletedComment) {
    throw new Error("COMMENT_NOT_FOUND_OR_UNAUTHORIZED");
  }

  // 삭제된 댓글 정보를 반환하여 호출자(Action)가 후속 처리를 할 수 있게 함
  return deletedComment;
}

// 3. 댓글 수정
export async function updateComment({
  commentId,
  userId,
  content,
}: {
  commentId: string;
  userId: string;
  content: string;
}) {
  const [updatedComment] = await db
    .update(comments)
    .set({ content })
    .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)))
    .returning();

  if (!updatedComment) {
    throw new Error("COMMENT_NOT_FOUND_OR_UNAUTHORIZED");
  }

  return updatedComment;
}

// -------------------------------------------------------------------
// 1. 댓글 조회 (Comment Get - Cursor Based)
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// 1. 타입 추출 (Single Source of Truth)
// -------------------------------------------------------------------
export type GetCommentsResponse = Awaited<
  ReturnType<typeof getCommentsService>
>;
export type CommentWithAuthor = GetCommentsResponse["comments"][number];

// -------------------------------------------------------------------
// 2. 최상위 댓글 조회 (Cursor Based)
// -------------------------------------------------------------------
export const getCommentsService = async ({
  postId,
  currentUserId,
  limit = 10,
  cursorId, // ID 기반 커서 (UUID)
}: {
  postId: string;
  currentUserId: string;
  limit?: number;
  cursorId?: string;
}) => {
  const commentsData = await db.query.comments.findMany({
    where: and(
      eq(comments.postId, postId),
      isNull(comments.parentId), // 최상위 댓글만
      cursorId ? lt(comments.id, cursorId) : undefined // 커서보다 작은 ID(이전 데이터)
    ),
    limit: limit + 1,
    orderBy: [desc(comments.id)], // 커서 기반 페이지네이션을 위해 ID 역순 정렬

    extras: {
      // ⭐️ [해결] 서브쿼리 내 cl 별칭 사용 및 올바른 PK(comments.id) 참조
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${commentLikes} cl 
        WHERE cl.comment_id = ${comments.id}
      )`.as("like_count"),

      replyCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${comments} c2 
        WHERE c2.parent_id = ${comments.id}
      )`.as("reply_count"),
    },

    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
      likes: {
        where: eq(commentLikes.userId, currentUserId),
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  // 다음 페이지를 위한 커서 계산
  let nextCursor: string | undefined = undefined;
  if (commentsData.length > limit) {
    const nextItem = commentsData.pop();
    nextCursor = nextItem?.id;
  }

  const mappedComments = commentsData.map((comment) => {
    const { likes, ...rest } = comment;
    return {
      ...rest,
      isOwner: comment.authorId === currentUserId,
      isLiked: likes.length > 0,
    };
  });

  return {
    comments: mappedComments,
    nextCursor,
  };
};

// -------------------------------------------------------------------
// 3. 대댓글 조회 (Cursor Based)
// -------------------------------------------------------------------
export const getRepliesService = async ({
  parentId,
  currentUserId,
  limit = 5,
  cursorId,
}: {
  parentId: string;
  currentUserId: string;
  limit?: number;
  cursorId?: string;
}) => {
  const repliesData = await db.query.comments.findMany({
    where: and(
      eq(comments.parentId, parentId),
      cursorId ? lt(comments.id, cursorId) : undefined
    ),
    limit: limit + 1,
    orderBy: [desc(comments.id)],

    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${commentLikes} cl 
        WHERE cl.comment_id = ${comments.id}
      )`.as("like_count"),
    },

    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
      likes: {
        where: eq(commentLikes.userId, currentUserId),
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  let nextCursor: string | undefined = undefined;
  if (repliesData.length > limit) {
    const nextItem = repliesData.pop();
    nextCursor = nextItem?.id;
  }

  const mappedReplies = repliesData.map((reply) => {
    const { likes, ...rest } = reply;
    return {
      ...rest,
      isOwner: reply.authorId === currentUserId,
      isLiked: likes.length > 0,
    };
  });

  return {
    data: mappedReplies,
    nextCursor,
  };
};