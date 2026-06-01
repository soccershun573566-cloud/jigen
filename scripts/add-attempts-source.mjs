// attempts に source カラムを追加(冪等)
//   - 'daily'    : 今日の問題から解いた(進捗にカウント)
//   - 'mistakes' : 間違えリストから解いた(進捗にカウントしない)
//   - 'other'    : その他
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`alter table attempts add column if not exists source text not null default 'daily'`;
  await sql`create index if not exists idx_attempts_source on attempts(user_id, source, attempted_at desc)`;
  console.log('OK: attempts.source added');
} finally {
  await sql.end();
}
