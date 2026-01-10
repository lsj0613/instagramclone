import mongoose from 'mongoose';

// 환경 변수 검증
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    '환경 변수 파일(.env.local)에 MONGODB_URI가 정의되지 않았습니다.'
  );
}

/**
 * 전역 객체(global)에 mongoose 연결 상태를 캐싱합니다.
 * 서버리스 환경에서 인스턴스가 재사용될 때 연결이 중복 생성되는 것을 방지합니다.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // 1. 이미 연결된 상태라면 기존 연결 반환
  if (cached?.conn) {
    return cached.conn;
  }

  // 2. 연결 프로세스가 없다면 새로운 프로미스 생성
  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  // 3. 연결 대기 및 결과 저장
  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;