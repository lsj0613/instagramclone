import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Comment 인터페이스 정의
export interface IComment extends Document {
  author: mongoose.Types.ObjectId; // 작성자 ID
  post: mongoose.Types.ObjectId;   // 게시물 ID
  content: string;                 // 댓글 내용
  createdAt: Date;
  updatedAt: Date;
}

// 2. Comment 스키마 정의
const CommentSchema = new Schema<IComment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '댓글 작성자 정보는 필수입니다.'],
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, '대상 게시물 정보는 필수입니다.'],
    },
    content: {
      type: String,
      required: [true, '댓글 내용을 입력해주세요.'],
      trim: true,
      maxlength: [1000, '댓글은 1000자 이내로 작성해주세요.'],
    },
  },
  {
    timestamps: true, // 생성 및 수정 시간 자동 기록
  }
);

// 3. 모델 생성 및 수출 (Next.js 싱글톤 패턴)
const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;