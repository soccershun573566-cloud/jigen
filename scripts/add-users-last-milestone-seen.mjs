// users に last_milestone_seen カラムを追加(冪等)
// 直近で見た節目番号(1=25問達成、 2=50問達成、 ...)
// daily_reset_at が更新されたら 0 にリセットされる
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`alter table users add column if not exists last_milestone_seen integer not null default 0`;
  console.log('OK: users.last_milestone_seen added');
} finally {
  await sql.end();
}
