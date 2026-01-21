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
export const getCommentsService = async ({
  postId,
  currentUserId,
  limit = 10,
  cursor = 0,
}: {
  postId: string;
  currentUserId: string;
  limit?: number;
  cursor?: number;
}) => {
  // 1. DB 쿼리 실행
  const commentsData = await db.query.comments.findMany({
    where: and(
      eq(comments.postId, postId),
      isNull(comments.parentId) // ⭐️ 중요: 최상위 댓글만 가져옵니다. (대댓글 제외)
    ),
    limit: limit + 1, // 다음 페이지 확인용으로 1개 더 가져옴
    offset: cursor,
    orderBy: (comments, { desc }) => [desc(comments.createdAt)], // 최신순

    // ⭐️ [추가] 좋아요 개수 & 대댓글 개수 (Live Count)
    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${commentLikes} 
        WHERE ${commentLikes.commentId} = ${comments.id}
      )`.as("like_count"),

      replyCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${comments} c2 
        WHERE c2.parent_id = ${comments.id}
      )`.as("reply_count"),
    },

    with: {
      author: {
        columns: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
      // ⭐️ [추가] 내가 좋아요 눌렀는지 확인용 (1개만 가져와서 존재 여부 체크)
      likes: {
        where: eq(commentLikes.userId, currentUserId),
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  // 2. 다음 페이지 커서 계산
  let nextCursor: number | undefined = undefined;
  if (commentsData.length > limit) {
    commentsData.pop(); // 확인용 1개 제거
    nextCursor = cursor + limit;
  }

  // 3. 데이터 가공 (isOwner, isLiked 추가)
  const mappedComments = commentsData.map((comment) => {
    const { likes, ...rest } = comment;

    return {
      ...rest,
      isOwner: comment.authorId === currentUserId, // 내 댓글인지?
      isLiked: likes.length > 0, // 내가 좋아요 눌렀는지?
    };
  });

  return {
    comments: mappedComments,
    nextCursor,
  };
};

// -------------------------------------------------------------------
// 2. 대댓글 조회 (Reply Get - Cursor Based)
// -------------------------------------------------------------------
export const getReplies = async ({
  parentId,
  currentUserId,
  limit = 20,
  cursorId, // ⭐️ offset 대신 cursorId
}: {
  parentId: string;
  currentUserId?: string;
  limit?: number;
  cursorId?: string;
}) => {
  const replies = await db.query.comments.findMany({
    where: and(
      eq(comments.parentId, parentId),
      // ⭐️ 대댓글도 무한 스크롤이 필요하다면 커서 적용
      cursorId ? lt(comments.id, cursorId) : undefined
    ),
    limit,
    orderBy: [desc(comments.id)], // ⭐️ 수정: createdAt 대신 id로 정렬하여 커서 기반 페이지네이션 일관성 유지

    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${commentLikes} 
        WHERE comment_likes.comment_id = ${comments.id}
      )`.as("like_count"),
    },

    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
      likes: {
        where: currentUserId
          ? eq(commentLikes.userId, currentUserId)
          : undefined,
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  return replies.map((reply) => {
    const { likes, ...rest } = reply;
    return {
      ...rest,
      isOwner: currentUserId ? reply.authorId === currentUserId : false,
      isLiked: likes.length > 0,
    };
  });
};