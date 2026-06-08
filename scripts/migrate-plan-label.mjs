import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
try {
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_label text`;
  // 既存契約者(monthly/yearly)のplan_label を補完
  await sql`UPDATE subscriptions SET plan_label = plan::text WHERE plan_label IS NULL`;
  console.log('✅ subscriptions.plan_label 追加 + 既存埋め完了');
} finally {
  await sql.end();
}
