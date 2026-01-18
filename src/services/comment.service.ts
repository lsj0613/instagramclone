import "server-only";

import db from "@/lib/db";
import { comments, commentLikes } from "@/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

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

// 4. 댓글 조회 (조회 전략인 unstable_cache는 유지)
// ... (getComments, getReplies 코드는 기존과 동일하게 유지)
const _getCommentsQuery = async (
  postId: string,
  currentUserId: string = "",
  limit: number,
  offset: number
) => {
  // ... (기존 쿼리 로직)
  const topLevelComments = await db.query.comments.findMany({
    where: and(eq(comments.postId, postId), isNull(comments.parentId)),
    limit,
    offset,
    orderBy: [desc(comments.createdAt)],
    extras: {
      likeCount:
        sql<number>`(SELECT count(*)::int FROM ${commentLikes} WHERE ${commentLikes.commentId} = ${comments.id})`.as(
          "like_count"
        ),
      replyCount:
        sql<number>`(SELECT count(*)::int FROM ${comments} c2 WHERE c2.parent_id = ${comments.id})`.as(
          "reply_count"
        ),
    },
    with: {
      author: { columns: { id: true, username: true, profileImage: true } },
      likes: {
        where: eq(commentLikes.userId, currentUserId),
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  return topLevelComments.map((comment) => {
    const { likes, ...rest } = comment;
    return {
      ...rest,
      isOwner: currentUserId ? comment.authorId === currentUserId : false,
      isLiked: likes.length > 0,
    };
  });
};

export const getComments = async ({
  postId,
  currentUserId,
  limit = 20,
  offset = 0,
}: {
  postId: string;
  currentUserId?: string;
  limit?: number;
  offset?: number;
}) => {
  const userIdKey = currentUserId ?? "guest";
  const cachedFn = unstable_cache(
    async () => _getCommentsQuery(postId, userIdKey, limit, offset),
    [`post-comments`, postId, userIdKey, limit.toString(), offset.toString()],
    { tags: [`post:${postId}:comments`], revalidate: 60 }
  );
  return cachedFn();
};

// -------------------------------------------------------------------
// 5. 대댓글 조회 (Reply Get - Cached)
// -------------------------------------------------------------------

// 내부 쿼리 함수 (캐싱 대상)
const _getRepliesQuery = async (
  parentId: string,
  currentUserId: string = "",
  limit: number,
  offset: number
) => {
  const replies = await db.query.comments.findMany({
    where: eq(comments.parentId, parentId), // ⭐️ 부모 댓글 ID로 필터링
    limit: limit,
    offset: offset,
    orderBy: [desc(comments.createdAt)], // 최신순 (또는 asc로 오래된순 선택 가능)
    
    // Live Count (대댓글의 좋아요 개수)
    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${commentLikes} 
        WHERE ${commentLikes.commentId} = ${comments.id}
      )`.as("like_count"),
    },
    
    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
      // 내가 좋아요 눌렀는지 확인
      likes: {
        where: eq(commentLikes.userId, currentUserId),
        columns: { userId: true },
        limit: 1,
      },
    },
  });

  // 데이터 가공 (isOwner, isLiked)
  return replies.map((reply) => {
    const { likes, ...rest } = reply;
    const isOwner = currentUserId ? reply.authorId === currentUserId : false;
    const isLiked = likes.length > 0;
    
    return { 
      ...rest, 
      isOwner, 
      isLiked,
      // likes 배열은 클라이언트에 노출하지 않음
    };
  });
};

// ⭐️ 외부 공개용 함수 (캐싱 적용)
export const getReplies = async ({
  parentId,
  currentUserId,
  limit = 20,
  offset = 0,
}: {
  parentId: string;
  currentUserId?: string;
  limit?: number;
  offset?: number;
}) => {
  const userIdKey = currentUserId ?? "guest";

  const cachedFn = unstable_cache(
    async () => _getRepliesQuery(parentId, userIdKey, limit, offset),
    // [Key Parts] 캐시 식별자
    [`comment-replies`, parentId, userIdKey, limit.toString(), offset.toString()],
    {
      // [Tags] 캐시 무효화용 태그
      // 부모 댓글이나 대댓글이 추가/삭제될 때 'comment:{parentId}:replies' 태그를 날리면 됩니다.
      tags: [`comment:${parentId}:replies`], 
      revalidate: 60, // 60초마다 자동 갱신 (좋아요 숫자 동기화)
    }
  );

  return cachedFn();
};