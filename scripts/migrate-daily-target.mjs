import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
try {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_target_questions integer NOT NULL DEFAULT 25`;
  console.log('✅ users.daily_target_questions 追加');
} finally {
  await sql.end();
}
