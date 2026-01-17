import { Pool, neonConfig } from "@neondatabase/serverless"; // [수정 1] neonConfig 추가
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import ws from "ws"; // [수정 2] ws 모듈 import
import { env } from "@/lib/env";



neonConfig.webSocketConstructor = ws;

// 2. Neon 서버리스 드라이버 연결
const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default db;
