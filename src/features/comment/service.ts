import "server-only";

import db from "@/lib/db";
import { comments, commentLikes, posts } from "@/db/schema";
import { and, desc, eq, isNull, sql, lt, SQL } from "drizzle-orm";
import {
  CreateCommentDTO,
  DeleteCommentDTO,
  UpdateCommentDTO,
  GetCommentsDTO,
  GetRepliesDTO,
} from "@/features/comment/validation";
import { ERROR_MESSAGES } from "@/shared/constants";
import { cache } from "react";
import { DbClient } from "@/lib/types"; // NodePgTransaction<typeof schema, ...>
import {
  CommentWithAuthor,
  PaginatedComments,
  UpdateCommentResponse,
  DeleteCommentResponse,
} from "@/features/comment/types";
import { runInTransaction } from "@/lib/run-in-transaction";

// -------------------------------------------------------------------
// [C/U/D] Write Operations
// -------------------------------------------------------------------

export async function createComment(data: CreateCommentDTO, tx?: DbClient) {
  return await runInTransaction(async (transaction) => {
    const [newComment] = await transaction
      .insert(comments)
      .values({
        postId: data.postId,
        authorId: data.authorId,
        content: data.content,
        parentId: data.parentId || null,
      })
      .returning();

    if (!newComment) throw new Error("Failed to create comment");

    await transaction
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, data.postId));

    if (data.parentId) {
      await transaction
        .update(comments)
        .set({ replyCount: sql`${comments.replyCount} + 1` })
        .where(eq(comments.id, data.parentId));
    }

    return newComment;
  }, tx);
}

export async function updateComment(
  data: UpdateCommentDTO,
  tx?: DbClient
): Promise<UpdateCommentResponse> {
  const client = tx || db;
  const [updated] = await client
    .update(comments)
    .set({ content: data.content, updatedAt: new Date() })
    .where(
      and(
        eq(comments.id, data.commentId),
        eq(comments.authorId, data.userId),
        isNull(comments.deletedAt)
      )
    )
    .returning({
      id: comments.id,
      content: comments.content,
      updatedAt: comments.updatedAt,
      postId: comments.postId,
    });

  if (!updated)
    throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND_OR_UNAUTHORIZED);
  return updated;
}

export async function deleteComment(
  data: DeleteCommentDTO,
  tx?: DbClient
): Promise<DeleteCommentResponse> {
  return await runInTransaction(async (transaction) => {
    const [deleted] = await transaction
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(comments.id, data.commentId),
          eq(comments.authorId, data.userId),
          isNull(comments.deletedAt)
        )
      )
      .returning({
        id: comments.id,
        postId: comments.postId,
        deletedAt: comments.deletedAt,
        parentId: comments.parentId,
      });

    if (!deleted)
      throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND_OR_UNAUTHORIZED);

    await transaction
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} - 1` })
      .where(eq(posts.id, deleted.postId));

    if (deleted.parentId) {
      await transaction
        .update(comments)
        .set({ replyCount: sql`${comments.replyCount} - 1` })
        .where(eq(comments.id, deleted.parentId));
    }

    return deleted;
  }, tx);
}

// -------------------------------------------------------------------
// [R] Read Operations (Pagination)
// -------------------------------------------------------------------

/**
 * 내부 쿼리 빌더 (중복 제거)
 */
const _fetchPaginatedComments = async (
  client: DbClient,
  condition: SQL | undefined, // any 대신 SQL 타입을 사용하세요.
  limit: number,
  currentUserId?: string | null
): Promise<PaginatedComments> => {
  // 1. limit + 1을 가져와서 다음 페이지 존재 여부 확인
  const rawData = await client.query.comments.findMany({
    where: and(condition, isNull(comments.deletedAt)),
    limit: limit + 1,
    orderBy: [desc(comments.id)],
    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
    },
    extras: {
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${commentLikes} cl
        WHERE cl.comment_id = ${comments.id}
        AND cl.user_id = ${
          currentUserId || "00000000-0000-0000-0000-000000000000"
        }
      )`.as("is_liked"),
    },
  });

  let nextCursor: string | undefined = undefined;
  if (rawData.length > limit) {
    const nextItem = rawData.pop();
    nextCursor = nextItem?.id;
  }

  const mappedComments = rawData.map((item) => ({
    ...item,
    isOwner: currentUserId ? item.authorId === currentUserId : false,
    isLiked: !!item.isLiked,
  })) as CommentWithAuthor[];

  return { comments: mappedComments, nextCursor };
};

// 최상위 댓글 목록 조회
export const getComments = cache(
  async (data: GetCommentsDTO, tx?: DbClient) => {
    const client = tx || db;
    const condition = and(
      eq(comments.postId, data.postId),
      isNull(comments.parentId),
      data.cursorId ? lt(comments.id, data.cursorId) : undefined
    );

    return await _fetchPaginatedComments(
      client,
      condition,
      data.limit,
      data.currentUserId
    );
  }
);

// 대댓글 목록 조회
export const getReplies = cache(async (data: GetRepliesDTO, tx?: DbClient) => {
  const client = tx || db;
  const condition = and(
    eq(comments.parentId, data.parentId),
    data.cursorId ? lt(comments.id, data.cursorId) : undefined
  );

  return await _fetchPaginatedComments(
    client,
    condition,
    data.limit,
    data.currentUserId
  );
});
