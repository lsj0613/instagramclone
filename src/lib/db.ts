import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema"; // 우리가 작성한 테이블 설계도

// 1. 환경변수 체크 (실수 방지)
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL이 .env 파일에 정의되지 않았습니다.");
}

// 2. Neon 서버리스 드라이버 연결 (HTTP 방식)
// Mongoose처럼 무거운 TCP 연결을 맺고 유지하는 방식이 아니라,
// 가벼운 HTTP 요청(Fetch)을 사용하므로 'global caching' 로직이 필요 없습니다.
const sql = neon(process.env.DATABASE_URL);

// 3. Drizzle ORM 인스턴스 생성 및 export
// { schema }를 넘겨줘야 db.query.users... 처럼 자동완성이 됩니다.
const db = drizzle(sql, { schema });

export default db