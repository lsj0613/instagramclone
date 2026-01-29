import { z } from "zod";
import { getCurrentUser } from "@/features/user/service";
import { ERROR_MESSAGES } from "@/shared/constants";
import { ActionResponse } from "./types";
import isRedirectError from "@/shared/utils/redirect";

/**
 * 🛡️ createSafeAction
 * zod-form-data를 사용하여 FormData와 Object를 모두 처리하고,
 * 실행 과정을 체계적으로 로깅하는 고차 함수입니다.
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  action: (
    data: TInput,
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  ) => Promise<TOutput>
) {
  return async (
    prevState: ActionResponse<TOutput> | null,
    data: FormData | TInput
  ): Promise<ActionResponse<TOutput>> => {
    // 실행된 액션의 이름을 가져옵니다 (디버깅용)
    const actionName = action.name || "AnonymousAction";

    try {
      // 1. 인증 확인
      const user = await getCurrentUser();
      if (!user) {
        console.warn(`[${actionName}:AUTH_FAIL] 인증되지 않은 사용자 접근`);
        return { success: false, message: ERROR_MESSAGES.AUTH_REQUIRED };
      }

      // 2. 유효성 검사 (zfd가 FormData/Object 자동 판별 후 파싱)
      const validationResult = schema.safeParse(data);

      if (!validationResult.success) {
        console.error(
          `[${actionName}:VALIDATION_FAIL] 유효하지 않은 입력 값:`,
          validationResult.error.flatten().fieldErrors
        );
        return {
          success: false,
          message: ERROR_MESSAGES.INVALID_INPUT,
          fieldErrors: validationResult.error.flatten().fieldErrors,
        };
      }

      // 3. 비즈니스 로직 실행
      console.log(`[${actionName}:START] User: ${user.id}`);
      const result = await action(validationResult.data, user);
      console.log(`[${actionName}:SUCCESS] 실행 완료`);

      return { success: true, data: result };
    } catch (error) {
      // Next.js의 redirect는 내부적으로 Error를 throw하므로 별도 처리 필요
      if (isRedirectError(error)) {
        console.log(`[${actionName}:REDIRECT] 리다이렉트 발생`);
        throw error;
      }

      // 실제 예상치 못한 에러 로깅
      console.error(`[${actionName}:UNEXPECTED_ERROR]`, error);

      const message =
        error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR;

      return { success: false, message };
    }
  };
}
