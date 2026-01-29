import "server-only";

import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { users, posts } from "@/db/schema";
import { eq, SQL, and, isNull, or, ilike, not } from "drizzle-orm"; // ⭐️ isNull 추가
import { cache } from "react";
import {
  GetUserDTO,
  UpdateUserDTO, // ⭐️ 유효성 검사 파일에 이 타입이 정의되어 있다고 가정
  DeleteUserDTO, // ⭐️ 유효성 검사 파일에 이 타입이 정의되어 있다고 가정 (없으면 userId: string)
} from "@/shared/utils/validation";
import { ERROR_MESSAGES } from "@/shared/constants";

// -------------------------------------------------------------------
// 1. 내부 쿼리 빌더 (Query Builders)
// -------------------------------------------------------------------

// [Summary] 유저 요약 정보 (미니 프로필용)
const _buildSummaryQuery = (condition: SQL) =>
  db.query.users.findFirst({
    where: and(condition, isNull(users.deletedAt)), // ⭐️ 삭제된 유저 제외
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
      isPrivate: true,
      // ⭐️ 필요한 경우 카운트 추가 가능하나, 요약엔 보통 불필요하여 제외
    },
    with: {
      // 최신 게시물 3개 미리보기
      posts: {
        where: isNull(posts.deletedAt), // ⭐️ 삭제된 게시물 제외
        limit: 3,
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        // ⭐️ extras 제거! 이제 columns에서 likeCount, commentCount가 자동 선택됨 (schema에 정의됨)
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
    where: and(condition, isNull(users.deletedAt)), // ⭐️ 삭제된 유저 제외
    columns: {
      id: true,
      username: true,
      name: true,
      profileImage: true,
      bio: true,
      createdAt: true,
      isPrivate: true,
      // ⭐️ [변경] 서브쿼리(extras) 대신 실제 컬럼 선택
      postCount: true,
      followerCount: true,
      followingCount: true,
    },
    with: {
      posts: {
        where: isNull(posts.deletedAt), // ⭐️ 삭제된 게시물 제외
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        // ⭐️ likeCount, commentCount는 posts 테이블 컬럼이므로 자동 포함됨
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

// Drizzle이 스키마 변경사항을 반영하여 자동으로 타입을 추론합니다.
type RawSummaryData = NonNullable<
  Awaited<ReturnType<typeof _buildSummaryQuery>>
>;
export type UserSummaryData = RawSummaryData & { isOwner: boolean };

type RawProfileData = NonNullable<
  Awaited<ReturnType<typeof _buildProfileQuery>>
>;
export type UserProfileData = RawProfileData & { isOwner: boolean };

// -------------------------------------------------------------------
// 3. 조회 서비스 함수 (Read)
// -------------------------------------------------------------------

/**
 * 유저 요약 정보 조회
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
 * 유저 프로필 상세 조회
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
// 4. 수정 및 삭제 서비스 함수 (Update & Delete)
// -------------------------------------------------------------------

/**
 * 유저 프로필 수정
 */
export async function updateUserInDb(
  data: UpdateUserDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [updatedUser] = await dbInstance
    .update(users)
    .set({
      name: data.name,
      bio: data.bio,
      profileImage: data.profileImage,
      isPrivate: data.isPrivate,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, data.userId),
        isNull(users.deletedAt) // ⭐️ 삭제된 유저는 수정 불가
      )
    )
    .returning();

  if (!updatedUser) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return updatedUser;
}

/**
 * 회원 탈퇴 (Soft Delete)
 */
export async function deleteUserInDb(
  data: DeleteUserDTO, // 혹은 { userId: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  // 1. Soft Delete 처리 (deletedAt 기록)
  const [deletedUser] = await dbInstance
    .update(users)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(users.id, data.userId),
        isNull(users.deletedAt) // 이미 삭제된 유저 중복 처리 방지
      )
    )
    .returning();

  if (!deletedUser) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // ⭐️ 참고: 여기서 연결된 posts, comments 등을 모두 update 칠 필요 없음
  // (조회 시 deletedAt 필터로 자동 처리 & Cron Job으로 나중에 정리)

  return deletedUser;
}

// -------------------------------------------------------------------
// 5. 현재 유저 정보 조회 (Auth)
// -------------------------------------------------------------------

const _currentUserTypeHelper = () =>
  db.query.users.findFirst({
    columns: { password: false },
  });

export type CurrentUserData = NonNullable<
  Awaited<ReturnType<typeof _currentUserTypeHelper>>
>;

/**
 * 현재 세션의 유저 정보 조회
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUserData | null> => {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const me = await db.query.users.findFirst({
      where: and(
        eq(users.id, session.user.id),
        isNull(users.deletedAt) // ⭐️ 삭제된 유저는 로그인 상태여도 조회 불가
      ),
      columns: {
        password: false,
      },
    });

    return me ?? null;
  }
);



function escapeLikeString(raw: string): string {
  return raw.replace(/[%_]/g, "\\$&");
}

export async function searchUsersInDb(query: string, currentUserId?: string) {
  // 1. 빈 검색어면 DB 호출 없이 즉시 빈 배열 반환 (성능 최적화)
  if (!query || query.trim() === "") {
    return [];
  }

  // 2. 검색어 이스케이프 (성능 공격 방어)
  const sanitizedQuery = escapeLikeString(query);
  const searchPattern = `${sanitizedQuery}%`; // 접두사 검색 (Prefix Search)

  // 3. DB 조회
  const searchResults = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      profileImage: users.profileImage,
      // 필요한 경우 isPrivate 등 추가
    })
    .from(users)
    .where(
      and(
        // (아이디 OR 이름) 매칭
        or(
          ilike(users.username, searchPattern),
          ilike(users.name, searchPattern)
        ),
        // ⭐️ [선택] 나 자신은 검색 결과에서 제외
        currentUserId ? not(eq(users.id, currentUserId)) : undefined,
        // ⭐️ [선택] 삭제된 유저 제외 (Soft Delete 적용 시 필수)
        isNull(users.deletedAt)
      )
    )
    .limit(20); // 과도한 데이터 로딩 방지

  return searchResults;
}


export type SearchUsersData = Awaited<ReturnType<typeof searchUsersInDb>>[number];