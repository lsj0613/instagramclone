import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Post 인터페이스 정의
// src/lib/models/Post.model.ts

// 1. 순수 데이터 구조만 정의 (Document 상속 X)
export interface IPostBase {
  likes: string[] | mongoose.Types.ObjectId[];
  images: string[];
  caption: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Mongoose 모델용 (서버 내부 사용)
export interface IPostDocument extends IPostBase, Document {
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
}

// --------------------------------------------------

// src/lib/actions/post.actions.ts

// 3. 클라이언트 전달용 (Omit 없이 Base 기반으로 확장)
export interface IPost extends IPostBase {
  _id: string; // 여기서 자유롭게 string으로 정의 가능
  author: {
    _id: string;
    username: string;
    profileImage?: string;
    bio?: string;
  };
  likes: string[];
}

// 2. Post 스키마 정의
const PostSchema = new Schema<IPostDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User', // User 모델을 참조
      required: [true, '작성자 정보는 필수입니다.'],
    },
    images: {
      type: [String], // 문자열 배열 타입
      validate: [(val: string[]) => val.length > 0, '최소 한 장의 이미지가 필요합니다.'],
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [2200, '본문은 2200자 이내로 작성해주세요.'],
      default: '',
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    location: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // 생성 및 수정 시간 자동 기록
  }
);

// 3. 모델 생성 및 수출 (Next.js 싱글톤 패턴)
const Post: Model<IPostDocument> = mongoose.models.Post || mongoose.model<IPostDocument>('Post', PostSchema);

export default Post;