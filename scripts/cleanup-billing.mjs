import postgres from 'postgres';
const url = 'postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const sql = postgres(url, { ssl: 'require' });
try {
  const rows = await sql`select user_id, stripe_customer_id, stripe_subscription_id, plan, status from subscriptions`;
  console.log('Current subscriptions:', rows);
  const del = await sql`delete from subscriptions where stripe_subscription_id is null returning user_id`;
  console.log('Deleted (no stripe_subscription_id):', del);
} finally {
  await sql.end();
}
