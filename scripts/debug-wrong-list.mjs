// オーナーユーザーの attempts と「間違えリスト判定」を直接確認
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
try {
  // 直近に attempt したユーザー
  const recent = await sql`
    select user_id, count(*) as c, count(*) filter (where is_correct=false) as wrong,
           min(attempted_at) as first, max(attempted_at) as last
    from attempts
    group by user_id
    order by max(attempted_at) desc
    limit 5
  `;
  console.log('=== Recent users ===');
  console.log(recent);

  if (recent.length === 0) { await sql.end(); process.exit(0); }
  const uid = recent[0].user_id;
  console.log('\n=== Target user:', uid, '===');

  // 該当ユーザーの全 attempts(時系列・問題別)
  const all = await sql`
    select question_id, attempted_at, is_correct, source
    from attempts
    where user_id = ${uid}
    order by question_id, attempted_at desc
    limit 30
  `;
  console.log('\n=== attempts (last 30 by question) ===');
  for (const a of all) {
    console.log(`  q=${a.question_id.slice(0,8)}  at=${a.attempted_at.toISOString()}  correct=${a.is_correct}  source=${a.source}`);
  }

  // 間違えリスト判定
  const wrongList = await sql`
    with attempt_seq as (
      select question_id, is_correct, attempted_at,
             row_number() over (partition by question_id order by attempted_at desc) as rn
      from attempts where user_id = ${uid}
    ),
    last_two as (
      select question_id,
             bool_or(case when rn=1 then is_correct end) as last1,
             bool_or(case when rn=2 then is_correct end) as last2
      from attempt_seq where rn <= 2
      group by question_id
    ),
    ever_wrong as (
      select distinct question_id from attempts
      where user_id = ${uid} and is_correct = false
    )
    select ew.question_id, lt.last1, lt.last2,
           (lt.last1 is not true or lt.last2 is not true) as should_show
    from ever_wrong ew
    left join last_two lt on lt.question_id = ew.question_id
  `;
  console.log('\n=== ever_wrong with judgment ===');
  for (const w of wrongList) {
    console.log(`  q=${w.question_id.slice(0,8)}  last1=${w.last1}  last2=${w.last2}  showInList=${w.should_show}`);
  }
  console.log(`\ntotal ever_wrong: ${wrongList.length}, should show: ${wrongList.filter(w => w.should_show).length}`);

  // ついでに source 分布も
  const sources = await sql`
    select source, count(*)::int as c
    from attempts where user_id = ${uid}
    group by source
  `;
  console.log('\n=== source distribution ===');
  console.log(sources);
} finally {
  await sql.end();
}
