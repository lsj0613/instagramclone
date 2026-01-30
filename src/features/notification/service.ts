import "server-only";

import db from "@/lib/db";
import { notifications } from "@/db/schema";
import { and, eq, desc, lt, SQL } from "drizzle-orm";
import { DbClient } from "@/lib/types";
import { runInTransaction } from "@/lib/run-in-transaction";
import { NotificationWithRelations, PaginatedNotifications } from "./types";
import { GetNotificationsDTO, ManageNotificationDTO, MarkAsReadDTO } from "./validation";

/**
 * 1. 알림 목록 조회 (Cursor-based Pagination)
 * - limit + 1 전략을 사용하여 다음 페이지 존재 여부 확인
 * - 세션 유저의 알림만 조회하며, 최신순으로 정렬
 */
export const getNotifications = async (
  data: GetNotificationsDTO,
  tx?: DbClient
): Promise<PaginatedNotifications> => {
  const client = tx || db;
  const { userId, limit, cursor } = data;

  // 커서(UUID)가 있을 경우 해당 ID보다 작은(이전 데이터) 레코드 필터링
  const condition = and(
    eq(notifications.recipientId, userId),
    cursor ? lt(notifications.id, cursor) : undefined
  );

  const rawData = await client.query.notifications.findMany({
    where: condition,
    with: {
      actor: {
        columns: { id: true, username: true, profileImage: true },
      },
    },
    // ID를 보조 정렬 기준으로 삼아 커서의 고유성 보장
    orderBy: [desc(notifications.createdAt), desc(notifications.id)],
    limit: limit + 1,
  });

  let nextCursor: string | null = null;
  if (rawData.length > limit) {
    const nextItem = rawData.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return {
    items: rawData as NotificationWithRelations[],
    nextCursor,
  };
};

/**
 * 2. 알림 생성 (Create)
 * - ManageNotificationDTO를 사용하여 알림 레코드 삽입
 * - 좋아요, 댓글, 팔로우 등 다양한 타입의 알림을 통합 처리
 */
export async function createNotification(
  data: ManageNotificationDTO,
  tx?: DbClient
) {
  return await runInTransaction(async (transaction) => {
    const [created] = await transaction
      .insert(notifications)
      .values({
        actorId: data.actorId,
        recipientId: data.recipientId,
        type: data.type,
        postId: data.postId,
        commentId: data.commentId,
        postLikeId: data.postLikeId,
        commentLikeId: data.commentLikeId,
        followId: data.followId,
      })
      .returning();

    return created;
  }, tx);
}

/**
 * 3. 알림 삭제 (Delete)
 * - 동일한 ManageNotificationDTO를 사용하여 조건에 맞는 알림 식별 및 삭제
 * - 좋아요 취소, 팔로우 취소 시 해당 알림을 제거하기 위해 사용
 */
export async function deleteNotification(
  data: ManageNotificationDTO,
  tx?: DbClient
) {
  return await runInTransaction(async (transaction) => {
    // 필수 필터 구성
    const filters: SQL[] = [
      eq(notifications.actorId, data.actorId),
      eq(notifications.recipientId, data.recipientId),
      eq(notifications.type, data.type),
    ];

    // 전달된 식별 ID가 있다면 필터에 동적으로 추가 (Type-safe)
    if (data.postId) filters.push(eq(notifications.postId, data.postId));
    if (data.commentId)
      filters.push(eq(notifications.commentId, data.commentId));
    if (data.postLikeId)
      filters.push(eq(notifications.postLikeId, data.postLikeId));
    if (data.commentLikeId)
      filters.push(eq(notifications.commentLikeId, data.commentLikeId));
    if (data.followId) filters.push(eq(notifications.followId, data.followId));

    const [deleted] = await transaction
      .delete(notifications)
      .where(and(...filters))
      .returning();

    return deleted;
  }, tx);
}

/**
 * 4. 특정 알림 읽음 처리 (Update)
 * - 본인의 알림 중 읽지 않은 상태(isRead: false)만 업데이트
 */
export async function markNotificationAsRead(
  data: MarkAsReadDTO,
  tx?: DbClient
) {
  const client = tx || db;

  const [updated] = await client
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, data.notificationId),
        eq(notifications.recipientId, data.userId),
        eq(notifications.isRead, false)
      )
    )
    .returning();

  return updated;
}
