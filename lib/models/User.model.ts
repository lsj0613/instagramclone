import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. 인터페이스 정의
export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  profileImage: string;
  bio: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  settings: {
    isPrivate: boolean;
    receiveNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Date;
  updatedAt: Date;
}

// 2. 스키마 정의
const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, '사용자 이름은 필수입니다.'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, '사용자 이름은 3자 이상이어야 합니다.'],
    },
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, '유효한 이메일 형식이 아닙니다.'],
    },
    password: {
      type: String,
      required: [false, '비밀번호는 필수입니다.'],
    },
    profileImage: {
      type: String,
      default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
    },
    bio: {
      type: String,
      maxlength: [150, '소개글은 150자 이내로 작성해주세요.'],
      default: '',
    },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // 오류 수정: settings를 필드 정의(첫 번째 인자) 내부로 이동
    settings: {
      isPrivate: { 
        type: Boolean, 
        default: false 
      },
      receiveNotifications: { 
        type: Boolean, 
        default: true 
      },
      theme: { 
        type: String, 
        enum: ['light', 'dark', 'system'],
        default: 'system' 
      }
    }
  },
  {
    timestamps: true, // 두 번째 인자인 옵션 객체
  }
);

// 3. 인덱스 설정 (조회 성능 최적화)


// 4. 모델 생성 및 수출 (Next.js 싱글톤 패턴)
const User = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;