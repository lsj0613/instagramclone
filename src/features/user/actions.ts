"use server";

import { createSafeAction } from "@/lib/safe-action"; // ⭐️ 만드신 createSafeAction 경로
import { SearchUserSchema } from "@/shared/utils/validation";
import { searchUsersInDb } from "./service";

/**
 * 유저 검색 액션
 * - 인증된 유저만 호출 가능 (createSafeAction 내부에서 처리)
 * - 입력값 검증 (Zod)
 * - 에러 처리 자동화
 */
export const searchUsersAction = createSafeAction(
  SearchUserSchema,
  async (data, user) => {
    // data.query는 Zod 검증을 통과한 문자열
    // user는 현재 로그인한 유저 객체
    const users = await searchUsersInDb(data.query, user.id);

    return users;
  }
);
