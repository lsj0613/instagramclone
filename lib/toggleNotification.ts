// "use server" 제거! -> 이제 이 함수는 서버 내부에서만 도는 일반 함수입니다.
import Notification from "@/models/notification.model";
import connectDB from "@/lib/db";

// 인자 타입을 명확하게 정의합니다.
// issuerId는 이제 호출하는 쪽(서버 액션)에서 확실하게 검증해서 넘겨줘야 합니다.
interface CreateNotificationParams {
  issuerId: string;
  receiverId: string;
  type: "LIKE" | "COMMENT" | "FOLLOW";
  postId?: string;
  commentId?: string;
}

// 1. 생성 로직 분리
export async function createNotification({
  issuerId,
  receiverId,
  type,
  postId,
  commentId,
}: CreateNotificationParams) {
  try {
    // 자기 자신에게 보내는 알림 차단
    if (issuerId === receiverId) return;

    await connectDB();

    // 중복 방지 (댓글 제외)
    if (type !== "COMMENT") {
      const existing = await Notification.findOne({
        issuer: issuerId,
        receiver: receiverId,
        type,
        postId: postId || null,
      });
      if (existing) return;
    }

    // 알림 생성
    await Notification.create({
      issuer: issuerId,
      receiver: receiverId,
      type,
      postId,
      commentId,
      isRead: false,
    });
  } catch (error) {
    console.error("Notification create error:", error);
    // 알림 실패가 메인 로직을 터뜨리지 않도록 에러 무시
  }
}

// 2. 삭제 로직 분리 (좋아요 취소 등)
export async function deleteNotification({
  issuerId,
  receiverId,
  type,
  postId,
  commentId,
}: CreateNotificationParams) {
  try {
    await connectDB();

    const query = {
      issuer: issuerId,
      receiver: receiverId,
      type,
      ...(postId && { postId }),
      ...(commentId && { commentId }),
    };

    await Notification.findOneAndDelete(query);
  } catch (error) {
    console.error("Notification delete error:", error);
  }
}