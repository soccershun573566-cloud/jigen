// 金曜小テスト用テーブル
// 毎週金曜0時(JST) 開催・1ユーザー1週1度・25問構成
import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_test_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start date NOT NULL,
      question_ids jsonb NOT NULL,
      answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      current_question_index integer NOT NULL DEFAULT 0,
      score integer,
      section_scores jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      UNIQUE(user_id, week_start)
    )
  `;
  console.log('✅ weekly_test_attempts テーブル作成');

  await sql`CREATE INDEX IF NOT EXISTS idx_weekly_test_user_week ON weekly_test_attempts(user_id, week_start DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_weekly_test_unfinished ON weekly_test_attempts(user_id) WHERE completed_at IS NULL`;
  console.log('✅ インデックス作成');

  await sql`ALTER TABLE weekly_test_attempts ENABLE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS weekly_test_self_select ON weekly_test_attempts`;
  await sql`DROP POLICY IF EXISTS weekly_test_self_insert ON weekly_test_attempts`;
  await sql`DROP POLICY IF EXISTS weekly_test_self_update ON weekly_test_attempts`;
  await sql`CREATE POLICY weekly_test_self_select ON weekly_test_attempts FOR SELECT USING (auth.uid() = user_id)`;
  await sql`CREATE POLICY weekly_test_self_insert ON weekly_test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id)`;
  await sql`CREATE POLICY weekly_test_self_update ON weekly_test_attempts FOR UPDATE USING (auth.uid() = user_id)`;
  console.log('✅ RLS ポリシー設定');

  console.log('🎉 weekly_test マイグレーション完了');
} catch (e) {
  console.error('❌ エラー:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
