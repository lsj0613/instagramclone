import "server-only";
import { cache } from "react";
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ERROR_MESSAGES } from "@/shared/constants";

// -------------------------------------------------------------------
// 1. 공통 유틸리티 타입 (DRY 원칙 적용)
// -------------------------------------------------------------------

// 어떤 데이터 타입이든 'isOwner' 속성을 붙여주는 제네릭
type WithOwnership<T> = T & { isOwner: boolean };

// -------------------------------------------------------------------
// 2. 쿼리 헬퍼 (타입 추론용)
// -------------------------------------------------------------------
const _summaryTypeHelper = () =>
  db.query.users.findFirst({
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
    },
    with: {
      posts: {
        columns: { id: true, likeCount: true, commentCount: true },
        with: {
          images: {
            orderBy: (imgs, { asc }) => [asc(imgs.order)],
            limit: 1,
            columns: { url: true },
          },
        },
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        limit: 3,
      },
    },
  });

const _profileTypeHelper = () =>
  db.query.users.findFirst({
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
      postCount: true,
      followerCount: true,
      followingCount: true,
    },
    with: {
      posts: {
        columns: { id: true, likeCount: true, commentCount: true },
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        with: {
          images: { limit: 1, orderBy: (imgs, { asc }) => [asc(imgs.order)] },
        },
      },
    },
  });

// -------------------------------------------------------------------
// 3. DTO 타입 정의 (통일됨)
// -------------------------------------------------------------------

// Drizzle 원본 타입 추출
type BaseSummaryData = NonNullable<Awaited<ReturnType<typeof _summaryTypeHelper>>>;
type BaseProfileData = NonNullable<Awaited<ReturnType<typeof _profileTypeHelper>>>;

// ⭐️ 최종 Export 타입 (둘 다 isOwner 포함)
export type UserSummaryData = WithOwnership<BaseSummaryData>;
export type UserProfileData = WithOwnership<BaseProfileData>;

// -------------------------------------------------------------------
// 4. 서비스 로직 (Unified Implementation)
// -------------------------------------------------------------------

type GetUserFunction = {
  // 오버로딩 1: 요약 정보 (currentUserId 추가)
  (
    identifier: string,
    by: "id" | "username",
    mode: "summary",
    currentUserId?: string
  ): Promise<UserSummaryData | null>;

  // 오버로딩 2: 프로필 상세 (currentUserId 추가)
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
  const condition =
    by === "id" ? eq(users.id, identifier) : eq(users.username, identifier);

  let result;

  // 1. 모드에 따라 쿼리 실행 (분기)
  if (mode === "summary") {
    result = await db.query.users.findFirst({
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
          columns: { id: true, likeCount: true, commentCount: true },
          with: {
            images: {
              orderBy: (imgs, { asc }) => [asc(imgs.order)],
              limit: 1,
              columns: { url: true },
            },
          },
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          limit: 3,
        },
      },
    });
  } else {
    result = await db.query.users.findFirst({
      where: condition,
      columns: {
        id: true,
        username: true,
        name: true,
        profileImage: true,
        bio: true,
        postCount: true,
        followerCount: true,
        followingCount: true,
      },
      with: {
        posts: {
          columns: { id: true, likeCount: true, commentCount: true },
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          with: {
            images: { limit: 1, orderBy: (imgs, { asc }) => [asc(imgs.order)] },
          },
        },
      },
    });
  }

  // 2. 공통 처리: 데이터 없으면 null
  if (!result) return null;

  // 3. 공통 처리: isOwner 계산 및 주입
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