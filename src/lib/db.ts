import { Pool, neonConfig } from "@neondatabase/serverless"; // [수정 1] neonConfig 추가
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import ws from "ws"; // [수정 2] ws 모듈 import

// 1. 환경변수 체크
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL이 .env 파일에 정의되지 않았습니다.");
}

// [수정 3] WebSocket 생성자 강제 설정 (이 줄이 핵심입니다!)
neonConfig.webSocketConstructor = ws;

// 2. Neon 서버리스 드라이버 연결
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default db;
