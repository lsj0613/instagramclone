// src/lib/actions/notification.actions.ts
"use server";

import db from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { unstable_noStore as noStore } from "next/cache";

// 1. 쿼리 실행 함수 (내부용) - export 안 해도 됨
// 이걸 따로 분리해야 리턴 타입을 자동으로 뽑아낼 수 있습니다.
const getNotificationsQuery = async (userId: string, limit: number) => {
  return await db.query.notifications.findMany({
    where: eq(notifications.recipientId, userId),
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
    orderBy: [desc(notifications.createdAt)],
    limit: limit,
  });
};

// 2. ✨ 마법의 타입 자동 생성
// 손으로 InferSelectModel, Pick 등을 적을 필요가 사라집니다.
export type NotificationWithRelations = Awaited<ReturnType<typeof getNotificationsQuery>>[number];

interface NotificationResponse {
  success: boolean;
  data?: NotificationWithRelations[]; // 위에서 만든 타입 사용
  error?: string;
}

// 3. 실제 액션 함수
export async function getNotificationsByUserId(
  userId: string,
  limit = 20
): Promise<NotificationResponse> {

  noStore();

  try {
    // 위에서 정의한 쿼리 함수 호출
    const notification = await getNotificationsQuery(userId, limit);

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "알림 조회 오류",
    };
  }
}