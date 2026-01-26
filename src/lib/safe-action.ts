/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { getCurrentUser } from "@/services/user.service"; // 방금 만든 서비스
import { ERROR_MESSAGES } from "@/shared/constants";
import { ActionResponse } from "./types";
import isRedirectError from "@/shared/utils/redirect";

/**
 * 🛡️ createSafeAction
 * 반복되는 인증, 유효성 검사, 에러 처리를 한방에 해결하는 고차 함수
 *
 * @param schema - Zod 스키마 (데이터 검증용)
 * @param action - 실제 비즈니스 로직 함수 (검증된 데이터와 유저 정보를 받음)
 */
// ... 기존 import ...

// ⭐️ [추가] FormData를 객체로 변환하는 똑똑한 헬퍼
function formDataToObject(formData: FormData): Record<string, any> {
  const object: Record<string, any> = {};

  formData.forEach((value, key) => {
    // 키가 이미 존재하면? -> 배열로 변환해서 push
    if (Reflect.has(object, key)) {
      if (Array.isArray(object[key])) {
        object[key].push(value);
      } else {
        object[key] = [object[key], value];
      }
    } else {
      // 처음 나온 키면 그냥 할당
      object[key] = value;
    }
  });

  return object;
}

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  action: (
    data: TInput,
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  ) => Promise<TOutput>
) {
  return async (
    prevState: ActionResponse<TOutput> | null,
    formData: FormData | TInput
  ): Promise<ActionResponse<TOutput>> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log("🚫 [SafeAction:Fail] 인증되지 않은 유저"); // 로그 추가
        return { success: false, message: ERROR_MESSAGES.AUTH_REQUIRED };
      }

      // ⭐️ [수정] 헬퍼 함수 사용
      const rawData =
        formData instanceof FormData ? formDataToObject(formData) : formData;

      // Zod가 preprocess 로직을 통해 타입을 맞춤 (String -> Number, JSON -> Object 등)
      const validationResult = schema.safeParse(rawData);

      if (!validationResult.success) {
        console.log(
          "⚠️ [SafeAction:Fail] 유효성 검사 실패",
          validationResult.error.flatten()
        ); // 로그 추가
        return {
          success: false,
          message: ERROR_MESSAGES.INVALID_INPUT,
          fieldErrors: validationResult.error.flatten().fieldErrors,
        };
      }

      const result = await action(validationResult.data, user);

      console.log("[SafeAction:Success]", JSON.stringify(result, null, 2));

      return { success: true, data: result };
    } catch (error) {
      if (isRedirectError(error)) {
        console.log("✈️ [SafeAction:Redirect] 리다이렉트 발생 (성공)"); // 로그 추가
        throw error; // 리다이렉트는 Next.js 엔진이 처리하도록 다시 던짐
      }
      console.error("Action Error:", error);
      const message =
        error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR;
      return { success: false, message };
    }
  };
}


