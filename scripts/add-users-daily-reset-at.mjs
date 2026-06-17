// users に daily_reset_at カラムを追加(冪等)
//   - null: リセット履歴なし(全期間集計のまま)
//   - timestamp: その時刻以降の attempts だけを「今日の問題」 としてカウント
// 重要: attempts/mastery_profiles は絶対に削除しない。 リセットは表示カウンタのみ。
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`alter table users add column if not exists daily_reset_at timestamptz`;
  console.log('OK: users.daily_reset_at added');
} finally {
  await sql.end();
}
