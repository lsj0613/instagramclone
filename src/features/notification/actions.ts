"use server";

import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";
import { markNotificationAsRead } from "./service";
import { UuidSchema } from "@/lib/validation";

// 액션용 스키마: 알림 ID만 받음
const MarkAsReadSchema = z.object({
  notificationId: UuidSchema,
});

/**
 * 알림 읽음 처리 액션
 */
export const markNotificationAsReadAction = createSafeAction(
  MarkAsReadSchema,
  async (data, user) => {
    // 1. 서비스 호출 (DTO 패턴: notificationId + user.id)
    const updated = await markNotificationAsRead({
      notificationId: data.notificationId,
      userId: user.id,
    });

    if (!updated) {
      // 이미 읽었거나 본인 알림이 아닌 경우
      throw new Error("알림을 처리할 수 없습니다.");
    }


    return updated;
  }
);
