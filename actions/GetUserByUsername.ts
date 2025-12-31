"use server";

import connectDB from "@/lib/db";
import User from "@/models/User.model";

/**
 * 클라이언트 컴포넌트로 전달하기 위해 직렬화된 유저 타입 정의
 * ObjectId와 Date 타입을 string으로 변환하여 정의합니다.
 */
export interface IUserSafe {
  _id: string;
  username: string;
  email: string;
  profileImage: string;
  bio: string;
  followers: string[];
  following: string[];
  settings: {
    isPrivate: boolean;
    receiveNotifications: boolean;
    theme: "light" | "dark" | "system";
  };
  createdAt: string;
  updatedAt: string;
}

interface UserResponse {
  success: boolean;
  data?: IUserSafe;
  error?: string;
}

/**
 * Retrieve a user's client-safe profile by their username.
 *
 * This excludes the `password` field and serializes database-specific types
 * (e.g., ObjectId, Date) to plain strings suitable for client transmission.
 *
 * @param username - The user's unique username used to look up the account
 * @returns A `UserResponse` whose `data` contains the serialized `IUserSafe` when the user is found; `success` is `false` and `error` contains a message otherwise
 */
export async function getUserByUsername(
  username: string
): Promise<UserResponse> {
  try {
    // 1. 데이터베이스 연결
    await connectDB();

    // 2. 유저 조회 (username은 unique 필드이므로 findOne 사용)
    // - password 필드는 보안상 제외합니다.
    // - .lean()을 통해 Mongoose Document가 아닌 순수 JS 객체를 반환받습니다.
    const user = await User.findOne({ username }).select("-password").lean();

    // 3. 유저 존재 여부 확인
    if (!user) {
      return {
        success: false,
        error: "해당 유저를 찾을 수 없습니다.",
      };
    }

    // 4. 데이터 직렬화 및 반환
    // 클라이언트 컴포넌트(Next.js)로 전송하기 위해 ObjectId와 Date 객체를 문자열로 변환합니다.
    const safeUser: IUserSafe = JSON.parse(JSON.stringify(user));

    return {
      success: true,
      data: safeUser,
    };
  } catch (error: unknown) {
    console.error("유저 정보 조회 오류:", error);

    let errorMessage = "유저 정보를 불러오는 중 서버 오류가 발생했습니다.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}