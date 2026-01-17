import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import { env } from "@/lib/env";

// 1. .env가 없으면 .env.local을 읽도록 설정 (Next.js 환경 대응)
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// 2. 환경 변수가 제대로 로드됐는지 확인 (디버깅용)


export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});