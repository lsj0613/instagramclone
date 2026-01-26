"use server";

import { z } from "zod";
import { createSafeAction } from "@/lib/safe-action";
import { toggleLikeInDb } from "@/services/like.service";

// 1. 입력 스키마 정의 (ID와 타입만 받으면 됨)
const ToggleLikeSchema = z.object({
  targetId: z.string(),
  targetType: z.enum(["POST", "COMMENT"]),
  finalIsLiked: z.boolean()
});

// 2. 액션 구현 (단순 호출)
export const toggleLikeAction = createSafeAction(
  ToggleLikeSchema,
  async (data, user) => {
    // 비즈니스 로직은 서비스 함수에게 위임
    const result = await toggleLikeInDb({
      targetId: data.targetId,
      targetType: data.targetType,
      finalIsLiked: data.finalIsLiked,
      userId: user.id,
    });

    // 결과 반환 (createSafeAction이 { success: true, data: result } 형태로 감싸줌)
    return result;
  }
);
