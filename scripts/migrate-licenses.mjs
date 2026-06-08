import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
try {
  await sql`
    CREATE TABLE IF NOT EXISTS licenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_type text NOT NULL,
      stripe_session_id text UNIQUE,
      stripe_payment_intent_id text,
      valid_until timestamptz NOT NULL,
      paid_amount integer NOT NULL,
      paid_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS licenses_user_id_idx ON licenses(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS licenses_valid_until_idx ON licenses(valid_until)`;
  console.log('✅ licenses テーブル作成');
} finally {
  await sql.end();
}
