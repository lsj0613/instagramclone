import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationDocument extends Document {
  issuer: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date; // timestamps에 의해 자동 생성됨을 명시
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    issuer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['LIKE', 'COMMENT', 'FOLLOW'], required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post' },
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isRead: { type: Boolean, default: false },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false },
    // lean() 사용 시 가상 필드가 필요하다면 아래 옵션 추가 (선택 사항)
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 최신 알림 조회 성능을 위한 복합 인덱스
NotificationSchema.index({ receiver: 1, createdAt: -1 });
NotificationSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotificationDocument> = 
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export default Notification;