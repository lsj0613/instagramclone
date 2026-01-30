import "server-only";

import db from "@/lib/db";
import { users, posts } from "@/db/schema";
import { eq, and, isNull, or, ilike, not } from "drizzle-orm";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { DbClient } from "@/lib/types";
import { runInTransaction } from "@/lib/run-in-transaction";
import { GetUserDTO, UpdateUserDTO, DeleteUserDTO } from "./validation";
import {
  UserSummaryData,
  UserProfileData,
  SearchUserData,
  CurrentUserData,
} from "./types";
import { ERROR_MESSAGES } from "@/shared/constants";

// -------------------------------------------------------------------
// [R] Read Operations
// -------------------------------------------------------------------

export const getUserSummary = cache(
  async (data: GetUserDTO, tx?: DbClient): Promise<UserSummaryData | null> => {
    const client = tx || db;
    const condition =
      data.by === "id"
        ? eq(users.id, data.identifier)
        : eq(users.username, data.identifier);

    const user = await client.query.users.findFirst({
      where: and(condition, isNull(users.deletedAt)),
      columns: {
        id: true,
        username: true,
        name: true,
        profileImage: true,
        bio: true,
        isPrivate: true,
      },
      with: {
        posts: {
          where: isNull(posts.deletedAt),
          limit: 3,
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          with: {
            images: {
              columns: { url: true, width: true, height: true },
              limit: 1,
            },
          },
        },
      },
    });

    if (!user) return null;
    return {
      ...user,
      isOwner: user.id === data.currentUserId,
    } as UserSummaryData;
  }
);

export const getUserProfile = cache(
  async (data: GetUserDTO, tx?: DbClient): Promise<UserProfileData | null> => {
    const client = tx || db;
    const condition =
      data.by === "id"
        ? eq(users.id, data.identifier)
        : eq(users.username, data.identifier);

    const user = await client.query.users.findFirst({
      where: and(condition, isNull(users.deletedAt)),
      columns: { password: false },
      with: {
        posts: {
          where: isNull(posts.deletedAt),
          orderBy: (posts, { desc }) => [desc(posts.createdAt)],
          // width, height를 포함한 모든 컬럼을 가져오도록 유지
          with: { images: { limit: 1 } },
        },
      },
    });

    if (!user) return null;
    return {
      ...user,
      isOwner: user.id === data.currentUserId,
    } as UserProfileData;
  }
);

export const getCurrentUser = cache(
  async (): Promise<CurrentUserData | null> => {
    const session = await auth();
    if (!session?.user?.id) return null;

    return (
      (await db.query.users.findFirst({
        where: and(eq(users.id, session.user.id), isNull(users.deletedAt)),
        columns: { password: false },
      })) || null
    );
  }
);

// -------------------------------------------------------------------
// [W] Write Operations
// -------------------------------------------------------------------

export async function updateUser(data: UpdateUserDTO, tx?: DbClient) {
  return await runInTransaction(async (transaction) => {
    const [updated] = await transaction
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, data.userId), isNull(users.deletedAt)))
      .returning();

    if (!updated) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    return updated;
  }, tx);
}

export async function deleteUser(data: DeleteUserDTO, tx?: DbClient) {
  return await runInTransaction(async (transaction) => {
    const [deleted] = await transaction
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, data.userId), isNull(users.deletedAt)))
      .returning();

    if (!deleted) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    return deleted;
  }, tx);
}

// -------------------------------------------------------------------
// [Search] Search Operations
// -------------------------------------------------------------------

function escapeLikeString(raw: string): string {
  return raw.replace(/[%_]/g, "\\$&");
}

export async function searchUsers(
  query: string,
  currentUserId?: string
): Promise<SearchUserData[]> {
  if (!query.trim()) return [];

  const searchPattern = `${escapeLikeString(query.trim())}%`;

  return await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      profileImage: users.profileImage,
    })
    .from(users)
    .where(
      and(
        or(
          ilike(users.username, searchPattern),
          ilike(users.name, searchPattern)
        ),
        currentUserId ? not(eq(users.id, currentUserId)) : undefined,
        isNull(users.deletedAt)
      )
    )
    .limit(20);
}
