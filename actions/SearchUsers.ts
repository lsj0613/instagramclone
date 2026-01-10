"use server";

import connectDB from "@/lib/db";
import User from "@/models/user.model";

export interface SearchUser {
  _id: string;
  username: string;
  profileImage: string;
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

    await connectDB();

    // Atlas Search ($search) 파이프라인 사용
    const users = await User.aggregate([
      {
        $search: {
          index: "default", // Atlas에서 만든 인덱스 이름
          autocomplete: {
            query: query,
            path: "username", // 검색할 필드
            fuzzy: {
              maxEdits: 1, // 오타 1글자까지 허용 (선택 사항)
            },
          },
        },
      },
      {
        $project: {
          // 필요한 필드만 가져오기 (1: 포함, 0: 제외)
          _id: 1,
          username: 1,
          profileImage: 1,
        },
      },
    ]);

    // 데이터 직렬화 (ObjectId -> string)
    // aggregate 결과는 lean()을 안 써도 순수 객체로 나옵니다.
    const formattedUsers: SearchUser[] = users.map((user) => ({
      _id: user._id.toString(),
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