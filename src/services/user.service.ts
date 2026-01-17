import "server-only";
import { cache } from "react";
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// -------------------------------------------------------------------
// 1. 타입 추론을 위한 헬퍼 함수
// -------------------------------------------------------------------
const getSummaryQuery = () =>
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

const getProfileQuery = () =>
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

// 💡 수정 1: | undefined 대신 | null 로 변경 (원한다면)
// Drizzle이 반환하는 원본 타입(undefined 포함)에서 undefined를 떼고 null을 붙입니다.
export type UserSummaryData = NonNullable<
  Awaited<ReturnType<typeof getSummaryQuery>>
> | null;
export type UserProfileData = NonNullable<
  Awaited<ReturnType<typeof getProfileQuery>>
> | null;

// -------------------------------------------------------------------
// 2. 실제 데이터 페칭 함수
// -------------------------------------------------------------------
type GetUserFunction = {
  (
    identifier: string,
    by: "id" | "username",
    mode: "summary"
  ): Promise<UserSummaryData>;
  (
    identifier: string,
    by: "id" | "username",
    mode: "profile"
  ): Promise<UserProfileData>;
};

const _getUserImpl = async (
  identifier: string,
  by: "id" | "username",
  mode: "summary" | "profile"
): Promise<UserSummaryData | UserProfileData> => {
  const condition =
    by === "id" ? eq(users.id, identifier) : eq(users.username, identifier);

  // 💡 수정 2: 결과값 뒤에 '?? null'을 붙여 undefined를 null로 변환
  if (mode === "summary") {
    const result = await db.query.users.findFirst({
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
    return result ?? null; // 👈 여기가 핵심
  } else {
    const result = await db.query.users.findFirst({
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
    return result ?? null; // 👈 여기가 핵심
  }
};

export const getUser = cache(_getUserImpl) as GetUserFunction;
