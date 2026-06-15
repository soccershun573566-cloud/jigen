// 100人スケール対応 追加インデックス
// 既存の migrate-perf-indexes と組み合わせて、 全主要クエリを高速化
import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

const indexes = [
  // source別フィルタ用(daily/mistakes/mock_/weekly_test_ で頻繁にフィルタする)
  {
    name: 'idx_attempts_user_source_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_user_source_at
          ON attempts (user_id, source, attempted_at DESC)`,
  },
  // 試験日逆算(home/profile/mastery で users.target_exam_date を引く)
  // 値を絞り込まないので部分インデックスにはせず、 covering index にする
  {
    name: 'idx_users_target_exam_date',
    sql: `CREATE INDEX IF NOT EXISTS idx_users_target_exam_date
          ON users (id)
          INCLUDE (target_exam_date, daily_target_questions, onboarded_at)`,
  },
  // 出題エンジンの section/sub_topic フィルタ(pickAdaptiveZpd 等で多用)
  {
    name: 'idx_questions_section_subtopic_published',
    sql: `CREATE INDEX IF NOT EXISTS idx_questions_section_subtopic_published
          ON questions (section, sub_topic)
          WHERE published = true`,
  },
  // 直近7日 attempts(weekly_test 動的生成・review ページの28日ヒートマップ用)
  {
    name: 'idx_attempts_recent',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_recent
          ON attempts (user_id, attempted_at DESC)
          INCLUDE (question_id, is_correct)`,
  },
  // mock_exam_questions の order_index(模試問題の順序取得)
  {
    name: 'idx_mock_exam_questions_order',
    sql: `CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_order
          ON mock_exam_questions (mock_exam_id, order_index)`,
  },
  // mastery_profiles の last_practiced_at(SRS判定)
  {
    name: 'idx_mastery_last_practiced',
    sql: `CREATE INDEX IF NOT EXISTS idx_mastery_last_practiced
          ON mastery_profiles (user_id, last_practiced_at DESC)`,
  },
  // subscriptions の status フィルタ
  {
    name: 'idx_subscriptions_user_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
          ON subscriptions (user_id)
          INCLUDE (plan, status, plan_label, trial_ends_at, current_period_end)`,
  },
];

try {
  console.log('🦖 100人スケール対応 追加インデックス開始...');
  for (const ix of indexes) {
    const t0 = Date.now();
    try {
      await sql.unsafe(ix.sql);
      console.log(`  ✅ ${ix.name} (${Date.now() - t0}ms)`);
    } catch (e) {
      console.log(`  ⚠️ ${ix.name} skip: ${e.message?.slice(0, 80)}`);
    }
  }

  // テーブル統計を更新(プランナーが新インデックスを使う判断材料)
  console.log('📊 ANALYZE 実行中...');
  await sql`ANALYZE attempts`;
  await sql`ANALYZE questions`;
  await sql`ANALYZE users`;
  await sql`ANALYZE mastery_profiles`;
  await sql`ANALYZE mock_attempts`;
  await sql`ANALYZE weekly_test_attempts`;
  await sql`ANALYZE subscriptions`;
  await sql`ANALYZE licenses`;
  console.log('✅ ANALYZE 完了');

  console.log('🎉 スケール対応インデックス追加完了');
} catch (e) {
  console.error('❌ エラー:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
