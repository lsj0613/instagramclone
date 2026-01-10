import Notification from "@/models/notification.model";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

interface CreateNotificationParams {
  issuerId: string;
  receiverId: string;
  type: "LIKE" | "COMMENT" | "FOLLOW";
  postId?: string;
  commentId?: string;
}

// 1. 생성 로직 (session 매개변수 추가)
export async function createNotification(
  { issuerId, receiverId, type, postId, commentId }: CreateNotificationParams,
  session?: mongoose.ClientSession // 세션 추가
) {
  try {
    if (issuerId === receiverId) return;

    await connectDB();

    if (type !== "COMMENT") {
      // .session(session)을 통해 트랜잭션에 참여
      const existing = await Notification.findOne({
        issuer: issuerId,
        receiver: receiverId,
        type,
        postId: postId || null,
      }).session(session || null); 
      
      if (existing) return;
    }

    // Mongoose에서 create에 session을 쓸 때는 첫 번째 인자를 배열[]로 전달해야 함
    await Notification.create(
      [
        {
          issuer: issuerId,
          receiver: receiverId,
          type,
          postId,
          commentId,
          isRead: false,
        },
      ],
      { session }
    );
  } catch (error) {
    console.error("Notification create error:", error);
    // [중요 분석] 트랜잭션 내부에서 에러를 throw하지 않으면, 
    // 메인 로직은 성공한 것으로 간주되어 커밋될 수 있습니다.
    // 알림 실패가 전체 로직의 실패로 이어져야 한다면 throw error가 필요합니다.
    if (session) throw error; 
  }
}

// 2. 삭제 로직 (session 매개변수 추가)
export async function deleteNotification(
  { issuerId, receiverId, type, postId, commentId }: CreateNotificationParams,
  session?: mongoose.ClientSession // 세션 추가
) {
  try {
    await connectDB();

    const query = {
      issuer: issuerId,
      receiver: receiverId,
      type,
      ...(postId && { postId }),
      ...(commentId && { commentId }),
    };

    // findOneAndDelete에 세션 옵션 전달
    await Notification.findOneAndDelete(query, { session });
  } catch (error) {
    console.error("Notification delete error:", error);
    if (session) throw error;
  }
}