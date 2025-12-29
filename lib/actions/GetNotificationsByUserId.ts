// src/lib/actions/notification.actions.ts
"use server";

import connectDB from "@/lib/db";
import Notification from "@/lib/models/Notification.model";
import "@/lib/models/User.model"; // populate를 위해 User 모델 로드 확인

interface NotificationResponse {
  success: boolean;
  data?: string; // 직렬화된 JSON 문자열
  error?: string;
}
/* 알림 발생자 정보가 populated된 notification을 반환 */
export async function getNotifications(userId: string): Promise<NotificationResponse> {
  try {
    await connectDB();

    /**
     * 1. 데이터 조회 및 정렬 로직
     * - find({ receiver: userId }): 본인이 수신자인 알림 필터링
     * - sort({ createdAt: -1 }): 최신순(내림차순) 정렬
     * - populate("issuer"): 알림을 발생시킨 유저 정보(이름, 프론트 이미지 등) 포함
     */
    const notifications = await Notification.find({ receiver: userId })
      .populate("issuer", "username profileImage")
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: JSON.stringify(notifications),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "알림 조회 중 오류가 발생했습니다.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}