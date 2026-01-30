import db from "./db";
import { DbClient } from "./types";

// 헬퍼: 트랜잭션 전파 처리
export async function runInTransaction<T>(
  callback: (tx: DbClient) => Promise<T>,
  tx?: DbClient
): Promise<T> {
  if (tx) return await callback(tx);
  return await db.transaction(async (newTx) => await callback(newTx));
}