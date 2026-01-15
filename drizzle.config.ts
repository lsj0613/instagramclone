import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. .env가 없으면 .env.local을 읽도록 설정 (Next.js 환경 대응)
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// 2. 환경 변수가 제대로 로드됐는지 확인 (디버깅용)
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL을 찾을 수 없습니다. .env.local 파일을 확인해주세요.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});