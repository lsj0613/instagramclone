import { posts, postImages } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

/**
 * 기초 DB 엔티티 타입
 */
export type PostEntity = InferSelectModel<typeof posts>;
export type PostImageEntity = InferSelectModel<typeof postImages>;

/**
 * 게시물 상세 정보 (UI용 확장 모델)
 * - 작성자 정보, 이미지 목록, 좋아요 여부, 본인 확인 여부를 포함
 */
export interface PostDetailData extends Omit<PostEntity, "createdAt"> {
  createdAt: string; // ISO String (캐시 직렬화 고려)
  author: {
    id: string;
    username: string;
    name: string | null;
    profileImage: string | null;
  };
  images: PostImageEntity[];
  isLiked: boolean;
  isOwner: boolean;
}

/**
 * 게시물 생성/수정/삭제 응답 타입
 */
export type CreatePostResponse = PostEntity;
export type UpdatePostResponse = PostEntity;
export type DeletePostResponse = Pick<
  PostEntity,
  "id" | "authorId" | "deletedAt"
>;

/**
 * 페이지네이션 피드 결과 타입
 */
export interface PaginatedPostResult {
  posts: PostDetailData[];
  nextCursor?: string | null;
}
