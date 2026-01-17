const checkEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ 필수 환경변수가 누락되었습니다: ${key}`);
  }
  return value;
};

// 검증이 필요한 서버 사이드 환경변수 목록
export const env = {
  // DB 관련
  DATABASE_URL: checkEnv("DATABASE_URL"),

  // Auth 관련
  AUTH_SECRET: checkEnv("AUTH_SECRET"),
  AUTH_GOOGLE_ID: checkEnv("AUTH_GOOGLE_ID"),
  AUTH_GOOGLE_SECRET: checkEnv("AUTH_GOOGLE_SECRET"),

  // Cloudinary (서버용)
  CLOUDINARY_API_SECRET: checkEnv("CLOUDINARY_API_SECRET"),
};

// 클라이언트 사이드 환경변수 (NEXT_PUBLIC_)
// 클라이언트는 번들링 시점에 값이 박히므로, 별도 객체로 관리하거나 여기서 같이 체크해도 됩니다.
export const publicEnv = {
  NEXT_PUBLIC_CLOUDINARY_API_KEY: checkEnv("NEXT_PUBLIC_CLOUDINARY_API_KEY"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: checkEnv(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
  ),
};
