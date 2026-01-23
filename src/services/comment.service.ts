import "server-only";

import db from "@/lib/db";
import { comments, commentLikes } from "@/db/schema";
import { and, desc, eq, isNull, sql, lt } from "drizzle-orm";
import {
  CreateCommentDTO,
  DeleteCommentDTO,
  UpdateCommentDTO,
  GetCommentsDTO,
  GetRepliesDTO,
  GetCommentsSchema,
  GetCommentsInput,
} from "@/shared/utils/validation";
import { ERROR_MESSAGES } from "@/shared/constants";

// -------------------------------------------------------------------
// 1. 댓글 생성 (Create) -> 단일 객체 반환
// -------------------------------------------------------------------
export async function createComment(
  data: CreateCommentDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [newComment] = await dbInstance
    .insert(comments)
    .values({
      postId: data.postId,
      authorId: data.authorId,
      content: data.content,
      parentId: data.parentId || null,
    })
    .returning();

  if (!newComment) throw new Error("Failed to create comment");

  return newComment;
}

// -------------------------------------------------------------------
// 2. 댓글 삭제 (Delete) -> 단일 객체 반환
// -------------------------------------------------------------------
export async function deleteComment(
  data: DeleteCommentDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [deletedComment] = await dbInstance
    .delete(comments)
    .where(
      and(eq(comments.id, data.commentId), eq(comments.authorId, data.userId))
    )
    .returning();

  if (!deletedComment) {
    throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND_OR_UNAUTHORIZED);
  }

  return deletedComment;
}

// -------------------------------------------------------------------
// 3. 댓글 수정 (Update) -> 단일 객체 반환
// -------------------------------------------------------------------
export async function updateComment(
  data: UpdateCommentDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [updatedComment] = await dbInstance
    .update(comments)
    .set({ content: data.content })
    .where(
      and(eq(comments.id, data.commentId), eq(comments.authorId, data.userId))
    )
    .returning();

  if (!updatedComment) {
    throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND_OR_UNAUTHORIZED);
  }

  return updatedComment;
}

// -------------------------------------------------------------------
// 4. 댓글 목록 조회 (Read - Pagination) -> 페이지네이션 객체 반환
// -------------------------------------------------------------------

// 내부 쿼리 빌더
const _buildCommentQuery = (
  condition: any,
  limit: number,
  currentUserId?: string | null
) => {
  return db.query.comments.findMany({
    where: condition,
    limit: limit + 1,
    orderBy: [desc(comments.id)],
    extras: {
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

      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM ${commentLikes} cl
        WHERE cl.comment_id = ${comments.id}
        AND cl.user_id = ${
          currentUserId || "00000000-0000-0000-0000-000000000000"
        }
      )`.as("is_liked"),
    },
    with: {
      author: {
        columns: { id: true, username: true, profileImage: true },
      },
    },
  });
};

// 타입 정의
type RawCommentList = Awaited<ReturnType<typeof _buildCommentQuery>>;
export type CommentWithAuthor = RawCommentList[number] & {
  isOwner: boolean;
};

// ⭐️ [수정] 반환 타입 이름을 명확하게 변경 (PaginatedResult)
export interface PaginatedCommentResult {
  comments: CommentWithAuthor[];
  nextCursor?: string;
}
// 내부 공통 함수 (Private)
const _fetchPaginatedComments = async (
  condition: any,
  limit: number,
  currentUserId?: string | null
): Promise<PaginatedCommentResult> => {
  // 1. 쿼리 실행
  const rawData = await _buildCommentQuery(condition, limit, currentUserId);

  // 2. 커서 계산
  let nextCursor: string | undefined = undefined;
  if (rawData.length > limit) {
    const nextItem = rawData.pop();
    nextCursor = nextItem?.id;
  }

  // 3. isOwner 매핑
  const mappedComments = rawData.map((item) => ({
    ...item,
    isOwner: currentUserId ? item.authorId === currentUserId : false,
  }));

  return { comments: mappedComments, nextCursor };
};

// -------------------------------------------------------------------

// 1. 최상위 댓글 조회 (Public)
export const getCommentsInDb = async (data: GetCommentsInput) => {
  const validatedData = GetCommentsSchema.parse(data);

  const condition = and(
    eq(comments.postId, validatedData.postId),
    isNull(comments.parentId), // ⭐️ 차이점 1
    validatedData.cursorId ? lt(comments.id, validatedData.cursorId) : undefined
  );

  return await _fetchPaginatedComments(
    condition,
    validatedData.limit,
    validatedData.currentUserId
  );
};

// 2. 대댓글 조회 (Public)
export const getReplies = async (data: GetRepliesDTO) => {
  const condition = and(
    eq(comments.parentId, data.parentId), // ⭐️ 차이점 2
    data.cursorId ? lt(comments.id, data.cursorId) : undefined
  );

  return await _fetchPaginatedComments(
    condition,
    data.limit,
    data.currentUserId
  );
};
