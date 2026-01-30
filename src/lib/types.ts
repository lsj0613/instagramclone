import * as schema from "@/db/schema";
import { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";
import { ExtractTablesWithRelations } from "drizzle-orm";

/**
 * 1. 관계형 스키마 타입 추출
 * db.query.comments.findMany 등을 사용할 때 타입 추론을 위해 필요합니다.
 */
type TSchema = typeof schema;
type TFullSchema = ExtractTablesWithRelations<TSchema>;

/**
 * 2. DB 및 Transaction 타입 정의
 * any 대신 PgQueryResultHKT와 스키마 타입을 명시합니다.
 */
export type DB = NodePgDatabase<TSchema>;
export type Transaction = NodePgTransaction<TSchema, TFullSchema>;
export type DbClient = DB | Transaction;

export type ActionResponse<T = null> = {
  success: boolean;
  message?: string | null; // 토스트(Toast)나 알림창에 띄울 사용자용 메시지
  data?: T | null; // 성공 시 반환할 데이터 (생성된 객체 등)
  fieldErrors?: Record<string, string[] | undefined>; // Zod 유효성 검사 실패 시 필드별 에러
  timestamp?: number; // ⭐️ 선택 사항: UX(useEffect 트리거)용
};
