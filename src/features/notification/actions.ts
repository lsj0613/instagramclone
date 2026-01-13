// src/lib/actions/notification.actions.ts
"use server";

import db from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { notifications, users, posts } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

// 1. 기본 Notification 타입 (DB 컬럼 기준)
type BaseNotification = InferSelectModel<typeof notifications>;

// 2. 'with'로 가져오는 연관 데이터의 타입을 명시적으로 결합
export type NotificationWithRelations = BaseNotification & {
  actor: Pick<InferSelectModel<typeof users>, "id" | "username" | "profileImage">;
  post: Pick<InferSelectModel<typeof posts>, "id"> | null;
};


interface NotificationResponse {
  success: boolean;
  data?: NotificationWithRelations[];
  error?: string;
}
/* 알림 발생자 정보가 populated된 notification을 반환 */
export async function getNotificationsByUserId(
  userId: string,
  limit = 20
): Promise<NotificationResponse> {
  try {
    /**
     * 1. 데이터 조회 및 정렬 로직
     * - find({ receiver: userId }): 본인이 수신자인 알림 필터링
     * - sort({ createdAt: -1 }): 최신순(내림차순) 정렬
     * - populate("issuer"): 알림을 발생시킨 유저 정보(이름, 프론트 이미지 등) 포함
     */
    const notification = await db.query.notifications.findMany({
      // 1. 내 알림만 필터링
      where: eq(notifications.recipientId, userId),
      
      // 2. 관련 데이터 조인 (유저 정보, 게시물 정보 등)
      with: {
        actor: {
          columns: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        post: {
          columns: {
            id: true,
          },
        },
      },

      // 3. 최신순 정렬 (index 활용)
      orderBy: [desc(notifications.createdAt)],
      
      // 4. 페이지네이션을 위한 제한
      limit: limit,
    });
    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "알림 조회 중 오류가 발생했습니다.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
