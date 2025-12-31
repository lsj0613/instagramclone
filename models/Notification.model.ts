import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  issuer: mongoose.Types.ObjectId;   // 알림을 발생시킨 사람 (예: 좋아요 누른 사람)
  receiver: mongoose.Types.ObjectId; // 알림을 받을 사람 (예: 게시물 작성자)
  type: 'LIKE' | 'COMMENT' | 'FOLLOW'; 
  postId?: mongoose.Types.ObjectId;  // 어떤 게시물 관련인지 (선택 사항)
  commentId?: mongoose.Types.ObjectId; // 어떤 댓글 관련인지 (선택 사항)
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    issuer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['LIKE', 'COMMENT', 'FOLLOW'], required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // 알림은 수정될 일이 거의 없으므로 createdAt만 관리
);

// 특정 사용자의 안 읽은 알림을 빠르게 조회하기 위해 복합 인덱스 설정
NotificationSchema.index({ receiver: 1, isRead: 1 });

const Notification: Model<INotification> = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;