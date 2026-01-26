import { z } from "zod";

/**
console.log("------------------ ENV DEBUG START ------------------");
console.log("1. 현재 실행 경로 (CWD):", process.cwd());
console.log(
  "2. CLOUD_NAME 값 확인:",
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
);
console.log("3. API_KEY 값 확인:", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
console.log("------------------- ENV DEBUG END -------------------");

 * 1. 클라이언트용 스키마 (브라우저 노출 가능)
 */
const clientSchema = z.object({
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
});

/**
 * 2. 서버용 스키마 (보안 중요)
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

// 타입 추론을 위한 인터페이스 정의
type ClientEnv = z.infer<typeof clientSchema>;
type ServerEnv = z.infer<typeof serverSchema>;

/**
 * 3. 클라이언트 환경변수 검증 (항상 실행)
 * - 클라이언트는 process.env.NEXT_PUBLIC_... 를 직접 명시해야 값이 채워집니다.
 */
const _clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

if (!_clientEnv.success) {
  console.error(
    "❌ 클라이언트 환경변수 에러:",
    _clientEnv.error.flatten().fieldErrors
  );
  console.log("Current ENV:", {
    API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
  throw new Error("클라이언트 환경변수 설정 오류");
}

// ✅ 클라이언트용 export (Client Component에서 사용)
export const publicEnv = _clientEnv.data;

/**
 * 4. 서버 환경변수 검증 (서버일 때만 실행)
 * - 브라우저에서 이 파일이 import 되어도 서버 로직을 실행하지 않아 에러가 나지 않습니다.
 */
let _serverEnv = {} as ServerEnv;

if (typeof window === "undefined") {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ 서버 환경변수 에러:", parsed.error.flatten().fieldErrors);
    throw new Error("서버 환경변수 설정 오류");
  }
  _serverEnv = parsed.data;
}

// ✅ 서버용 export (Server Component / API Route / DB 등에서 사용)
// 서버에서는 publicEnv와 serverEnv를 합쳐서 제공하거나, 분리해서 써도 됩니다.
export const env = { ...publicEnv, ..._serverEnv };
