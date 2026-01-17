"use server";

import { ilike, or } from "drizzle-orm";
import { users } from "@/db/schema";
import db from "@/lib/db";
import { ActionResponse } from "@/lib/types";

export interface SearchUser {
  id: string;
  username: string;
  name: string | null
  profileImage: string | null;
}


export async function searchUsersAction(
  prevstate: ActionResponse<SearchUser[]> | null,
  query: string
): Promise<ActionResponse<SearchUser[]>> {
  try {
    if (!query || query.trim() === "") {
      return { success: true, data: [] };
    }

    const searchPattern = `%${query}%`;

    // 2. Drizzle Query 수행
    // select를 통해 필요한 필드만 가져옴 (Projection)

    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(
        // ⭐️ [수정] username 또는 name 둘 중 하나라도 포함되면 검색
        or(
          ilike(users.username, searchPattern),
          ilike(users.name, searchPattern)
        )
      )
      .limit(20);

    return {
      success: true,
      data: searchResults,
    };
  } catch (error) {
    console.error("Atlas Search error:", error);
    return {
      success: false,
      error: "검색 중 오류가 발생했습니다.",
    };
  }
}
