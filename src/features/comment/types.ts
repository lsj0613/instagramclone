import { comments } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

/**
 * DB Row 타입 (Drizzle 제공 유틸리티 활용)
 */
export type CommentEntity = InferSelectModel<typeof comments>;

/**
 * UI에 표시될 댓글 데이터 구조 (작성자 정보 포함)
 */
export interface CommentWithAuthor extends CommentEntity {
  author: {
    id: string;
    username: string;
    profileImage: string | null;
  };
  isLiked: boolean;
  isOwner: boolean;
  replyCount: number;
}

/**
 * 페이지네이션 응답 구조
 */
export interface PaginatedComments {
  comments: CommentWithAuthor[];
  nextCursor?: string;
}


/**
 * 1. 수정 시 반환 타입
 * 수정된 내용과 수정 시간을 포함합니다.
 */
export type UpdateCommentResponse = Pick<
  CommentEntity,
  "id" | "content" | "updatedAt" | "postId"
>;

/**
 * 2. 삭제 시 반환 타입 (Soft Delete)
 * 어떤 게시물의 댓글이 삭제되었는지(revalidate용), 삭제 시간이 언제인지 반환합니다.
 */
export type DeleteCommentResponse = Pick<
  CommentEntity,
  "id" | "postId" | "deletedAt"
>;
