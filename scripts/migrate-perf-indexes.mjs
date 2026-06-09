// 演習・分析の重いクエリを高速化するインデックスを追加(IF NOT EXISTS なので冪等)
// 2026-06-09: ジゲン全体のレスポンス底上げ用
import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

const indexes = [
  // 採点 API・出題 API・進捗カウント の全クエリで使用
  // user_id + attempted_at DESC で「特定ユーザーの最新N件」 が即取れる
  {
    name: 'idx_attempts_user_attempted_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_user_attempted_at
          ON attempts (user_id, attempted_at DESC)`,
  },
  // pickReviewDue / pickSrsDue の window関数で多用
  // user_id + question_id の組合せ
  {
    name: 'idx_attempts_user_question',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_user_question
          ON attempts (user_id, question_id)`,
  },
  // 今日の進捗カウント(source='daily')
  // partial index で daily 行だけ抽出
  {
    name: 'idx_attempts_daily_today',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_daily_today
          ON attempts (user_id, attempted_at DESC)
          WHERE source = 'daily'`,
  },
  // 全ユーザー集計(pickAdaptiveZpd の q_stats CTE 用)
  // question_id + is_correct で「この問題の全ユーザー正答率」 が即取れる
  {
    name: 'idx_attempts_question_correct',
    sql: `CREATE INDEX IF NOT EXISTS idx_attempts_question_correct
          ON attempts (question_id, is_correct)`,
  },
  // questions.published フィルタが頻出(出題プールの全クエリ)
  {
    name: 'idx_questions_published',
    sql: `CREATE INDEX IF NOT EXISTS idx_questions_published
          ON questions (published)
          WHERE published = true`,
  },
  // mastery_profiles の self select
  {
    name: 'idx_mastery_user_subtopic',
    sql: `CREATE INDEX IF NOT EXISTS idx_mastery_user_subtopic
          ON mastery_profiles (user_id, sub_topic)`,
  },
  // mock_attempts(模試一覧・特別模試バナー)
  {
    name: 'idx_mock_attempts_user_exam',
    sql: `CREATE INDEX IF NOT EXISTS idx_mock_attempts_user_exam
          ON mock_attempts (user_id, mock_exam_id)`,
  },
  // licenses(プラン管理・billing)
  {
    name: 'idx_licenses_user_validuntil',
    sql: `CREATE INDEX IF NOT EXISTS idx_licenses_user_validuntil
          ON licenses (user_id, valid_until DESC)`,
  },
];

try {
  console.log('🦖 ジゲン パフォーマンスインデックス追加開始...');
  for (const ix of indexes) {
    const t0 = Date.now();
    await sql.unsafe(ix.sql);
    console.log(`  ✅ ${ix.name} (${Date.now() - t0}ms)`);
  }
  console.log('🎉 全インデックス追加完了');
} catch (e) {
  console.error('❌ エラー:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
