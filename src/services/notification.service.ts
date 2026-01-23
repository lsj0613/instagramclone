import "server-only";
import db from "@/lib/db";
import { notifications } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { ManageNotificationDTO } from "@/shared/utils/validation";

// 1. 조회 (기존 유지)
export const getNotifications = async (userId: string, limit: number) => {
  return await db.query.notifications.findMany({
    where: eq(notifications.recipientId, userId),
    with: {
      actor: {
        columns: { id: true, username: true, profileImage: true },
      },
      post: {
        columns: { id: true },
      },
    },
    orderBy: [desc(notifications.createdAt)],
    limit: limit,
  });
};

export type NotificationWithRelations = Awaited<
  ReturnType<typeof getNotifications>
>[number];

// 2. 생성 (Create) - ⭐️ 반환값 추가 및 새 필드 적용
export async function createNotification(
  data: ManageNotificationDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [createdNotification] = await dbInstance
    .insert(notifications)
    .values({
      actorId: data.actorId,
      recipientId: data.recipientId,
      type: data.type,
      postId: data.postId,
      commentId: data.commentId,
      // ⭐️ 새로 추가된 필드들
      postLikeId: data.postLikeId,
      commentLikeId: data.commentLikeId,
      followId: data.followId,
    })
    .returning(); // ⭐️ 생성된 객체 반환

  return createdNotification;
}

// 3. 삭제 (Delete) - ⭐️ 반환값 추가 및 새 필드 조건 처리
export async function deleteNotification(
  data: ManageNotificationDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  // 조건부 쿼리 구성
  const filters = [
    eq(notifications.actorId, data.actorId),
    eq(notifications.recipientId, data.recipientId),
    eq(notifications.type, data.type),
  ];

  if (data.postId) filters.push(eq(notifications.postId, data.postId));
  if (data.commentId) filters.push(eq(notifications.commentId, data.commentId));

  // ⭐️ 새 필드 조건 추가
  if (data.postLikeId)
    filters.push(eq(notifications.postLikeId, data.postLikeId));
  if (data.commentLikeId)
    filters.push(eq(notifications.commentLikeId, data.commentLikeId));
  if (data.followId) filters.push(eq(notifications.followId, data.followId));

  const [deletedNotification] = await dbInstance
    .delete(notifications)
    .where(and(...filters))
    .returning(); // ⭐️ 삭제된 객체 반환

  return deletedNotification;
}
