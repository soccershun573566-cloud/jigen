// questions に is_applied カラムを追加(冪等)
//   - true  : 応用能力問題(五肢二択・正答2つ)
//   - false : 通常の四肢択一問題
// 1日問題数の30%は必ず応用問題から出題するためのフラグ。
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  await sql`alter table questions add column if not exists is_applied boolean not null default false`;
  await sql`create index if not exists idx_questions_applied on questions(is_applied, published) where published = true`;
  const [{ applied, normal }] = await sql`
    select
      count(*) filter (where is_applied = true)::int as applied,
      count(*) filter (where is_applied = false)::int as normal
    from questions where published = true
  `;
  console.log(`OK: questions.is_applied added — applied=${applied}, normal=${normal}`);
} finally {
  await sql.end();
}
