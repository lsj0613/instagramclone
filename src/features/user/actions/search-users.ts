"use server";

import { ilike } from "drizzle-orm";
import { users } from "@/db/schema";
import db from "@/lib/db";

export interface SearchUser {
  id: string;
  username: string;
  profileImage: string|null;
}

interface SearchResponse {
  success: boolean;
  data?: SearchUser[];
  error?: string;
}

export async function searchUsers(prevstate: SearchResponse, query: string): Promise<SearchResponse> {
  try {
    if (!query || query.trim() === "") {
      return { success: true, data: [] };
    }


    // Atlas Search ($search) 파이프라인 사용
    const searchPattern = `%${query}%`;

    // 2. Drizzle Query 수행
    // select를 통해 필요한 필드만 가져옴 (Projection)
    const rawusers = await db
      .select({
        id: users.id,
        username: users.username,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(
        // username에 검색어가 포함되어 있는지 확인 (대소문자 무시)
        ilike(users.username, searchPattern)
      )
      .limit(20);

    // 데이터 직렬화 (ObjectId -> string)
    // aggregate 결과는 lean()을 안 써도 순수 객체로 나옵니다.
    const formattedUsers: SearchUser[] = rawusers.map((user) => ({
      id: user.id.toString(),
      username: user.username,
      profileImage: user.profileImage,
    }));

    return {
      success: true,
      data: formattedUsers,
    };
  } catch (error) {
    console.error("Atlas Search error:", error);
    return {
      success: false,
      error: "검색 중 오류가 발생했습니다.",
    };
  }
}