"use server";

import { ilike, or } from "drizzle-orm";
import { users } from "@/db/schema";
import db from "@/lib/db";
import { ActionResponse } from "@/lib/types";
import { ERROR_MESSAGES } from "@/shared/constants";

export interface SearchUser {
  id: string;
  username: string;
  name: string | null;
  profileImage: string | null;
}

export async function searchUsersAction(
  prevstate: ActionResponse<SearchUser[]> | null,
  query: string
): Promise<ActionResponse<SearchUser[]>> {
  try {
    // 검색어가 없으면 빈 배열 반환 (성공으로 처리)
    if (!query || query.trim() === "") {
      return { success: true, data: [] };
    }

    const searchPattern = `${query}%`;

    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, searchPattern),
          ilike(users.name, searchPattern)
        )
      )
      .limit(20);

    return {
      success: true,
      data: searchResults, // 결과가 없으면 자연스럽게 []가 들어갑니다.
    };
  } catch (error) {
    console.error("Search error:", error);
    return {
      success: false,
      // ⭐️ 수정됨: fieldErrors(객체) 대신 message(문자열) 필드 사용
      message: ERROR_MESSAGES.SEARCH_ERROR,
    };
  }
}
