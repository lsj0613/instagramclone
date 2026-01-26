import "server-only";

import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { users, posts, follows, postLikes, comments } from "@/db/schema";
import { eq, sql, SQL } from "drizzle-orm";
import { cache } from "react";
import { GetUserDTO } from "@/shared/utils/validation";

// -------------------------------------------------------------------
// 1. 내부 쿼리 빌더 (Query Builders)
// -------------------------------------------------------------------

// [Summary] 유저 요약 정보 (미니 프로필용)
const _buildSummaryQuery = (condition: SQL) =>
  db.query.users.findFirst({
    where: condition,
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
      isPrivate: true, // ⭐️ [추가] 비공개 계정 여부
    },
    with: {
      // 최신 게시물 3개 미리보기
      posts: {
        limit: 3,
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        extras: {
          likeCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${postLikes} pl
            WHERE pl.post_id = ${posts.id}          
          )`.as("like_count"),

          commentCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${comments} c
            WHERE c.post_id = ${posts.id}
          )`.as("comment_count"),
        },
        with: {
          images: {
            orderBy: (imgs, { asc }) => [asc(imgs.order)],
            limit: 1, // 썸네일 1장만
          },
        },
      },
    },
  });

// [Profile] 유저 상세 정보 (프로필 페이지용)
const _buildProfileQuery = (condition: SQL) =>
  db.query.users.findFirst({
    where: condition,
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
      createdAt: true,
      isPrivate: true, // ⭐️ [추가] 비공개 계정 여부
    },
    extras: {
      postCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${posts} p
        WHERE p.author_id = ${users.id}
      )`.as("post_count"),

      // 팔로워: 나를(followingId=me) 팔로우하는 사람 수
      followerCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${follows} f
        WHERE f.following_id = ${users.id} 
        AND f.status = 'ACCEPTED'
      )`.as("follower_count"),

      // 팔로잉: 내가(followerId=me) 팔로우하는 사람 수
      followingCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${follows} f
        WHERE f.follower_id = ${users.id} 
        AND f.status = 'ACCEPTED'
      )`.as("following_count"),
    },
    with: {
      posts: {
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        extras: {
          likeCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${postLikes} pl
            WHERE pl.post_id = ${posts.id}
          )`.as("like_count"),

          commentCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${comments} c
            WHERE c.post_id = ${posts.id}
          )`.as("comment_count"),
        },
        with: {
          images: {
            orderBy: (imgs, { asc }) => [asc(imgs.order)],
            limit: 1,
          },
        },
      },
    },
  });

// -------------------------------------------------------------------
// 2. 타입 정의 (Types)
// -------------------------------------------------------------------

// 자동으로 isPrivate 필드가 포함된 타입으로 추론됩니다.
type RawSummaryData = NonNullable<
  Awaited<ReturnType<typeof _buildSummaryQuery>>
>;
export type UserSummaryData = RawSummaryData & { isOwner: boolean };

type RawProfileData = NonNullable<
  Awaited<ReturnType<typeof _buildProfileQuery>>
>;
export type UserProfileData = RawProfileData & { isOwner: boolean };

// -------------------------------------------------------------------
// 3. 서비스 함수 (Service Functions)
// -------------------------------------------------------------------

/**
 * 유저 요약 정보 조회 (호버 카드 등)
 */
const _getUserSummary = async (
  data: GetUserDTO
): Promise<UserSummaryData | null> => {
  const condition =
    data.by === "id"
      ? eq(users.id, data.identifier)
      : eq(users.username, data.identifier);

  const user = await _buildSummaryQuery(condition);

  if (!user) return null;

  return {
    ...user,
    isOwner: data.currentUserId ? user.id === data.currentUserId : false,
  };
};
export const getUserSummary = cache(_getUserSummary);

/**
 * 유저 프로필 상세 조회 (페이지 방문)
 */
const _getUserProfile = async (
  data: GetUserDTO
): Promise<UserProfileData | null> => {
  const condition =
    data.by === "id"
      ? eq(users.id, data.identifier)
      : eq(users.username, data.identifier);

  const user = await _buildProfileQuery(condition);

  if (!user) return null;

  return {
    ...user,
    isOwner: data.currentUserId ? user.id === data.currentUserId : false,
  };
};
export const getUserProfile = cache(_getUserProfile);

// -------------------------------------------------------------------
// 4. 현재 유저 정보 조회 (Auth)
// -------------------------------------------------------------------

const _currentUserTypeHelper = () =>
  db.query.users.findFirst({
    columns: { password: false },
  });

export type CurrentUserData = NonNullable<
  Awaited<ReturnType<typeof _currentUserTypeHelper>>
>;

/**
 * 현재 세션의 유저 정보 조회 (Auth.js 연동)
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUserData | null> => {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const me = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        password: false,
      },
    });

    return me ?? null;
  }
);
