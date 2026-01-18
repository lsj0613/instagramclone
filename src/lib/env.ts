import { zodResolver } from "@hookform/resolvers/zod"; // 이전 질문과 연관
import { z } from "zod";

// 1. 스키마 정의 (런타임 검증 및 타입 추론을 동시에 해결)
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  // 클라이언트 환경변수도 한꺼번에 정의 가능
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
});

// 2. 검증 수행
const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});

if (!_env.success) {
  // 에러의 상세 내용을 구조화하여 출력
  const errorDetails = _env.error.flatten().fieldErrors;
  console.error(
    "❌ 환경변수 검증 실패 상세:",
    JSON.stringify(errorDetails, null, 2)
  );

  // 어떤 환경(서버/클라이언트)에서 실행 중인지 확인
  console.log(
    "실행 환경:",
    typeof window === "undefined" ? "서버" : "클라이언트"
  );

  throw new Error("환경변수 설정 오류");
}

export const env = _env.data;
