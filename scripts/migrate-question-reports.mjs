// 問題への通報機能用テーブル
// ユーザーが「答えが違う」 「問題文がおかしい」 等を報告するための受け皿
import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS question_reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      category text NOT NULL,
      comment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz,
      resolved_note text
    )
  `;
  console.log('✅ question_reports テーブル作成');

  await sql`CREATE INDEX IF NOT EXISTS idx_question_reports_user ON question_reports(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_question_reports_question ON question_reports(question_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_question_reports_unresolved ON question_reports(created_at DESC) WHERE resolved_at IS NULL`;
  console.log('✅ インデックス作成');

  // RLS: 自分の通報のみ insert/select 可
  await sql`ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY`;
  // 既存ポリシー削除して再作成
  await sql`DROP POLICY IF EXISTS question_reports_self_insert ON question_reports`;
  await sql`DROP POLICY IF EXISTS question_reports_self_select ON question_reports`;
  await sql`
    CREATE POLICY question_reports_self_insert ON question_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id)
  `;
  await sql`
    CREATE POLICY question_reports_self_select ON question_reports
    FOR SELECT USING (auth.uid() = user_id)
  `;
  console.log('✅ RLS ポリシー設定');

  console.log('🎉 question_reports マイグレーション完了');
} catch (e) {
  console.error('❌ エラー:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
