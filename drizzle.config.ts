import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. 환경변수 로드
dotenv.config({
  path: ".env.local",
});

// 2. 설정 내보내기
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // ⭐️ env 객체 대신 process.env 직접 사용
    url: process.env.DATABASE_URL!,
  },
});
