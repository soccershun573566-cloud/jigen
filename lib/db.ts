import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

// Drizzle DB クライアント(サーバー専用)
// Lazy 初期化: ビルド時の "Collecting page data" 段階で DATABASE_URL が
// 未設定でもモジュールロードが失敗しないようにする。
// 初回 db.select() 等で実際に接続される。

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  _drizzleDb?: DrizzleDb;
  _pgClient?: ReturnType<typeof postgres>;
};

function createDb(): DrizzleDb {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL missing');
  }
  if (!globalForDb._pgClient) {
    globalForDb._pgClient = postgres(connectionString, {
      prepare: false,
      max: 10,
    });
  }
  return drizzle(globalForDb._pgClient, { schema });
}

// Proxy で遅延初期化。import 時には createDb() を呼ばない。
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    if (!globalForDb._drizzleDb) {
      globalForDb._drizzleDb = createDb();
    }
    return Reflect.get(globalForDb._drizzleDb, prop, receiver);
  },
});

export type DB = DrizzleDb;
