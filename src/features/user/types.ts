import { users, posts, postImages } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

/**
 * [기초 엔티티] DB 테이블에서 직접 추론한 타입
 */
export type UserEntity = InferSelectModel<typeof users>;
export type PostEntity = InferSelectModel<typeof posts>;
export type PostImageEntity = InferSelectModel<typeof postImages>;

/**
 * [프로필 게시물] 프로필 페이지 그리드용
 * - CLS 방지를 위해 이미지의 크기 정보(width, height)를 반드시 포함합니다.
 */
export interface ProfilePost extends PostEntity {
  images: Array<
    Pick<PostImageEntity, "id" | "url" | "altText" | "width" | "height">
  >;
}

/**
 * [유저 프로필 상세]
 */
export interface UserProfileData extends Omit<UserEntity, "password"> {
  isOwner: boolean;
  posts: ProfilePost[];
}

/**
 * [유저 검색 결과]
 */
export type SearchUserData = Pick<
  UserEntity,
  "id" | "username" | "name" | "profileImage"
>;

// 비밀번호를 제외한 현재 유저 정보
export type CurrentUserData = Omit<UserEntity, "password">;

// 미니 프로필용 요약 데이터
export interface UserSummaryData {
  id: string;
  username: string;
  name: string | null;
  profileImage: string | null;
  bio: string | null;
  isPrivate: boolean;
  isOwner: boolean;
  posts: Array<{
    id: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  }>;
}
