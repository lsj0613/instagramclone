import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. 반드시 env.ts를 임포트하기 전에 로드해야 합니다.
dotenv.config({
  path: ".env.local", // Next.js 환경변수 파일 위치 (기본 .env라면 .env로 작성)
});

export default defineConfig({
  schema: "./src/db/schema.ts", // 스키마 경로
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 직접 process.env에서 읽거나 검증된 env 객체 사용
  },
});
