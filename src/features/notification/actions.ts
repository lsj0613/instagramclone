// src/features/notification/actions.ts
"use server";

import { unstable_noStore as noStore } from "next/cache";
import {
  getNotifications,
  type NotificationWithRelations,
} from "@/services/notification.service";
import { getCurrentUser } from "@/services/user.service";

interface NotificationResponse {
  success: boolean;
  data?: NotificationWithRelations[];
  error?: string;
}

// ⭐️ userId 인자 제거
export async function getNotificationsAction(
  limit = 20
): Promise<NotificationResponse> {
  noStore();

  try {
    // 1. 세션에서 사용자 ID 추출 (보안의 핵심)
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      // 로그인하지 않은 사용자의 접근 차단
      return {
        success: false,
        error: "로그인이 필요한 서비스입니다.",
      };
    }

    // 2. 서비스 호출 (추출한 userId 사용)
    const data = await getNotifications(currentUser.id, limit);

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Notification Error:", error);
    return {
      success: false,
      error: "알림을 불러오는 중 오류가 발생했습니다.",
    };
  }
}
