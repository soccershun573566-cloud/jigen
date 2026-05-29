import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

// Drizzle DB クライアント(サーバー専用)
// 技術構築計画§2.4

const connectionString = process.env.DATABASE_URL;

// HMR で接続が増えないようにグローバルキャッシュ
const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
};

function getClient() {
  if (!connectionString) {
    throw new Error('DATABASE_URL missing');
  }
  if (!globalForDb._pgClient) {
    globalForDb._pgClient = postgres(connectionString, {
      prepare: false, // Supabase pooler 互換
      max: 10,
    });
  }
  return globalForDb._pgClient;
}

export const db = drizzle(getClient(), { schema });
export type DB = typeof db;
