import "server-only";
import { cache } from "react";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { users, posts, follows, postLikes, comments } from "@/db/schema"; // ⭐️ 필요한 테이블 모두 임포트
import { eq, sql, SQL } from "drizzle-orm";

// -------------------------------------------------------------------
// 1. 공통 유틸리티 타입
// -------------------------------------------------------------------

type WithOwnership<T> = T & { isOwner: boolean };

// -------------------------------------------------------------------
// 2. 쿼리 헬퍼
// -------------------------------------------------------------------



// -------------------------------------------------------------------
// 2. 쿼리 헬퍼 (수정됨)
// -------------------------------------------------------------------

const _summaryQueryHelper = (condition: SQL) =>
  db.query.users.findFirst({
    where: condition,
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
    },
    with: {
      posts: {
        limit: 3,
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        extras: {
          // ⭐️ [수정] post_likes, comments 테이블의 컬럼명은 직접 문자열로 작성 (snake_case)
          likeCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${postLikes} 
            WHERE post_likes.post_id = ${posts.id}
          )`.as("like_count"),
          
          commentCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${comments} 
            WHERE comments.post_id = ${posts.id}
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

const _profileQueryHelper = (condition: SQL) =>
  db.query.users.findFirst({
    where: condition,
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
    },
    extras: {
      // ⭐️ [수정] posts, follows 테이블의 컬럼명은 직접 문자열로 작성
      // ${posts.authorId} -> posts.author_id (X) 테이블명 명시 필요
      // 쿼리 안정성을 위해 테이블명(posts, follows)도 명시하는 것이 좋습니다.
      
      postCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${posts} 
        WHERE posts.author_id = ${users.id}
      )`.as("post_count"),
      
      followerCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${follows} 
        WHERE follows.following_id = ${users.id} 
        AND follows.status = 'ACCEPTED'
      )`.as("follower_count"),
      
      followingCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${follows} 
        WHERE follows.follower_id = ${users.id} 
        AND follows.status = 'ACCEPTED'
      )`.as("following_count"),
    },
    with: {
      posts: {
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        extras: {
          // ⭐️ [수정] 여기도 마찬가지로 수정
          likeCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${postLikes} 
            WHERE post_likes.post_id = ${posts.id}
          )`.as("like_count"),
          
          commentCount: sql<number>`(
            SELECT count(*)::int 
            FROM ${comments} 
            WHERE comments.post_id = ${posts.id}
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
// 3. DTO 타입 정의
// -------------------------------------------------------------------

type BaseSummaryData = NonNullable<Awaited<ReturnType<typeof _summaryQueryHelper>>>;
type BaseProfileData = NonNullable<Awaited<ReturnType<typeof _profileQueryHelper>>>;

export type UserSummaryData = WithOwnership<BaseSummaryData>;
export type UserProfileData = WithOwnership<BaseProfileData>;

// -------------------------------------------------------------------
// 4. 서비스 로직
// -------------------------------------------------------------------

type GetUserFunction = {
  (
    identifier: string,
    by: "id" | "username",
    mode: "summary",
    currentUserId?: string
  ): Promise<UserSummaryData | null>;

  (
    identifier: string,
    by: "id" | "username",
    mode: "profile",
    currentUserId?: string
  ): Promise<UserProfileData | null>;
};

const _getUserImpl = async (
  identifier: string,
  by: "id" | "username",
  mode: "summary" | "profile",
  currentUserId?: string
): Promise<UserSummaryData | UserProfileData | null> => {
  // eq() 함수의 반환값은 'SQL' 타입입니다.
  const condition =
    by === "id" ? eq(users.id, identifier) : eq(users.username, identifier);

  let result;

  if (mode === "summary") {
    result = await _summaryQueryHelper(condition);
  } else {
    result = await _profileQueryHelper(condition);
  }

  if (!result) return null;

  const isOwner = currentUserId ? result.id === currentUserId : false;

  return {
    ...result,
    isOwner,
  };
};

export const getUser = cache(_getUserImpl) as GetUserFunction;




// -------------------------------------------------------------------
//  내 정보(Current User)용 타입 정의
// -------------------------------------------------------------------

// 1. 타입 추론 헬퍼 (비밀번호 제외 쿼리)
const _currentUserTypeHelper = () => 
  db.query.users.findFirst({
    columns: {
      password: false, // ⭐️ 비밀번호 제외됨을 명시
    },
  });

// 2. DTO 타입 정의 (순수 객체)
// 이제 이 타입은 'password' 속성 자체가 아예 없습니다.
export type CurrentUserData = NonNullable<
  Awaited<ReturnType<typeof _currentUserTypeHelper>>
>;

// -------------------------------------------------------------------
//  getCurrentUser 함수
// -------------------------------------------------------------------

export async function getCurrentUser(): Promise<CurrentUserData | null> {
  const session = await auth();

  // 1. 세션이 없으면 null
  if (!session?.user?.id) {
    return null;
  }

  // 2. DB 조회 (비밀번호 제외)
  const me = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      password: false,
    },
  });

  return me ?? null;
}