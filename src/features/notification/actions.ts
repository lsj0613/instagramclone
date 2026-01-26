"use server";

import { createSafeAction } from "@/lib/safe-action";
import { markNotificationAsRead } from "@/services/notification.service";
import z from "zod";

//TODO : 알림 읽음 여부 변경하는 서버액션 작성하기

const markNotificationAsReadActionSchema = z.object({
  notificationId: z
    .string({ message: "알림 ID가 필요합니다." })
    .uuid("유효하지 않은 알림 ID 형식입니다."),
});

export const markNotificationAsReadAction = createSafeAction(
  markNotificationAsReadActionSchema,
  async (data, user) => {
    const markedNotification = await markNotificationAsRead({notificationId : data.notificationId, userId : user.id});
    return markedNotification;
  }
);