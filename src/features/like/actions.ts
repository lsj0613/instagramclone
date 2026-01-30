"use server";

import { createSafeAction } from "@/lib/safe-action";
import { toggleLike } from "./service"; // 이름 변경 반영
import { ToggleLikeSchema } from "./validation";

export const toggleLikeAction = createSafeAction(
  ToggleLikeSchema,
  async (data, user) => {
    // DTO 구성 시 user.id 주입
    return await toggleLike({
      ...data,
      userId: user.id,
    });
  }
);
