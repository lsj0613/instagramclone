// 서버용 검증 함수 (서버는 process.env가 실제로 존재하므로 동적 접근 가능)
const checkEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`❌ 필수 서버 환경변수 누락: ${key}`);
  return value;
};

// 클라이언트용 검증 함수 (값을 직접 받아야 함)
const checkPublicEnv = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`❌ 필수 클라이언트 환경변수 누락: ${key}`);
  return value;
};

export const env = {
  DATABASE_URL: checkEnv("DATABASE_URL"),
  AUTH_SECRET: checkEnv("AUTH_SECRET"),
  AUTH_GOOGLE_ID: checkEnv("AUTH_GOOGLE_ID"),
  AUTH_GOOGLE_SECRET: checkEnv("AUTH_GOOGLE_SECRET"),
  CLOUDINARY_API_SECRET: checkEnv("CLOUDINARY_API_SECRET"),
};

export const publicEnv = {
  // ⭐️ 여기서 process.env.변수명을 '직접' 써야 Next.js가 값을 채워줍니다.
  NEXT_PUBLIC_CLOUDINARY_API_KEY: checkPublicEnv(
    "NEXT_PUBLIC_CLOUDINARY_API_KEY",
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
  ),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: checkPublicEnv(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  ),
};
