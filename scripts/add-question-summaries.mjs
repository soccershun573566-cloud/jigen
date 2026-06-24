// question_summaries テーブルを作成(冪等)
// 各問題に対する「解説要約・ポイント・穴埋め問題・穴埋め正解」 を AI生成 → キャッシュ
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`
    create table if not exists question_summaries (
      question_id uuid primary key references questions(id) on delete cascade,
      short_explanation text not null,
      key_point text not null,
      fill_in_question text not null,
      fill_in_answers jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  console.log('OK: question_summaries created');
} finally {
  await sql.end();
}
