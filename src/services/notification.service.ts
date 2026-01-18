import "server-only";
import db from "@/lib/db";
import { notifications } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

// 1. 쿼리 함수 (export 필수)
// 이름은 조금 더 명확하게 getNotifications로 변경해도 좋습니다.
export const getNotifications = async (userId: string, limit: number) => {
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

// 2. ✨ 마법의 타입 자동 생성 (여기서 export)
// 서비스 함수가 여기 있으므로, ReturnType 추론도 여기서 해야 합니다.
export type NotificationWithRelations = Awaited<
  ReturnType<typeof getNotifications>
>[number];

/**
 * 알림 생성에 필요한 파라미터 인터페이스
 * 스키마의 type 정의와 일치하도록 구성
 */
interface manageNotificationParams {
  actorId: string; // 알림을 발생시킨 사용자 ID (UUID)
  recipientId: string; // 알림을 받을 사용자 ID (UUID)
  type:
    | "LIKE"
    | "COMMENT"
    | "FOLLOW"
    | "REPLY"
    | "COMMENT_LIKE"
    | "FOLLOW_REQUEST";
  postId?: string; // 관련 게시물 ID (선택 사항)
  commentId?: string; // 관련 댓글 ID (선택 사항)
}

/**
 * @param params 알림 데이터
 * @param tx Drizzle 트랜잭션 객체 (상위 로직의 트랜잭션에 참여할 경우 전달)
 */
export async function createNotification(
  params: manageNotificationParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any // Drizzle PgTransaction 타입을 유연하게 처리
) {
  // 트랜잭션(tx)이 인자로 넘어오면 그것을 사용하고, 없으면 기본 db 객체 사용
  const dbInstance = tx || db;

  try {
    await dbInstance.insert(notifications).values({
      actorId: params.actorId,
      recipientId: params.recipientId,
      type: params.type,
      postId: params.postId,
      commentId: params.commentId,
      // isRead는 기본값이 false이므로 생략 가능
      // createdAt은 defaultNow()이므로 생략 가능
    });
  } catch (error) {
    // 트랜잭션 내에서 에러 발생 시 상위로 전파하여 전체 롤백 유도
    console.error("[Notification Service] Insert Error:", error);
    throw error;
  }
}

// 2. 삭제 로직 (session 매개변수 추가)

/**
 * 알림 삭제 함수
 * @param params 삭제할 알림을 식별하기 위한 데이터
 * @param tx Drizzle 트랜잭션 객체 (선택 사항)
 */
export async function deleteNotification(
  params: manageNotificationParams,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  try {
    await dbInstance.delete(notifications).where(
      and(
        eq(notifications.actorId, params.actorId),
        eq(notifications.recipientId, params.recipientId),
        eq(notifications.type, params.type),
        // postId가 제공된 경우 조건에 추가
        params.postId ? eq(notifications.postId, params.postId) : undefined,
        // commentId가 제공된 경우 조건에 추가
        params.commentId
          ? eq(notifications.commentId, params.commentId)
          : undefined
      )
    );
  } catch (error) {
    console.error("[Notification Service] Delete Error:", error);
    throw error; // 상위 트랜잭션 롤백을 위해 에러 전파
  }
}
