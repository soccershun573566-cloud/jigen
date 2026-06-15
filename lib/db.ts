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
    // 【100人スケール対応】 Vercel Functions + Supabase Pooler のベストプラクティス
    // - max: 1 ← 各invocationで1接続だけ持つ(同時起動増えてもPooler枯渇しない)
    //   Supabase Transaction Pooler は1接続を効率的に再利用するため、 これで十分高速
    //   Vercel公式ガイドも postgres-js + Supabase Pooler では max:1 を推奨
    // - prepare: false ← Supabase Transaction Pooler は prepared statements 非対応
    // - idle_timeout: 20 ← 20秒アイドルで切断(リソース節約)
    // - connect_timeout: 10 ← 10秒で接続タイムアウト(ヘルスチェック)
    // - max_lifetime: 60 * 30 ← 30分で接続再生成(長寿命接続のメモリリーク防止)
    globalForDb._pgClient = postgres(connectionString, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
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
