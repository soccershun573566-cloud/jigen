// 500問応用能力問題(五肢二択) を questions に投入
//   ・ year=2099 を「応用問題」 識別年として既存30問と同じ慣例で再利用
//   ・ q_number=1〜500、 is_applied=true、 published=true、 copyright_status='original'
//   ・ section='施工管理法'(応用能力は施工管理法カテゴリ)
//   ・ sub_topic='躯体施工/中分類' or '仕上施工/中分類'(大分野+中分類)
//   ・ 既存 year=2099 は attempts ごと delete し冪等
import xlsx from 'xlsx';
import postgres from 'postgres';

const XLSX_PATH = 'C:\\Users\\user\\Documents\\Claude\\Projects\\1級施工管理技士\\1級建築施工管理_応用能力問題集500.xlsx';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

function parseAnswer(s) {
  // "3・5" or "3,5" or "3 5" → [3, 5]
  return String(s)
    .split(/[・,、\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

async function main() {
  const wb = xlsx.readFile(XLSX_PATH);
  const qSheet = xlsx.utils.sheet_to_json(wb.Sheets['問題'], { header: 1, defval: '', blankrows: false });
  const aSheet = xlsx.utils.sheet_to_json(wb.Sheets['解答・解説'], { header: 1, defval: '', blankrows: false });

  // headers
  // 問題: ["No","分野","中分類","設問","選択肢1",..,"選択肢5"]
  // 解答・解説: ["No","分野","中分類","正答(2つ)","解説"]

  const ansByNo = new Map();
  for (let i = 1; i < aSheet.length; i++) {
    const r = aSheet[i];
    if (!r[0]) continue;
    ansByNo.set(Number(r[0]), { answer: parseAnswer(r[3]), explanation: String(r[4] || '').trim() });
  }

  const records = [];
  for (let i = 1; i < qSheet.length; i++) {
    const r = qSheet[i];
    if (!r[0]) continue;
    const no = Number(r[0]);
    const field = String(r[1] || '').trim();      // 躯体施工 / 仕上施工
    const subMid = String(r[2] || '').trim();     // 中分類
    const body = String(r[3] || '').trim();
    const choices = [r[4], r[5], r[6], r[7], r[8]].map((x) => String(x || '').trim());
    const a = ansByNo.get(no);
    if (!a || a.answer.length !== 2) {
      throw new Error(`No.${no}: answer parse failed: ${JSON.stringify(a)}`);
    }
    if (choices.some((c) => c === '')) {
      throw new Error(`No.${no}: empty choice`);
    }
    records.push({
      year: 2099,
      q_number: no,
      section: '施工管理法',
      sub_topic: `${field}/${subMid}`,
      difficulty: 0.6,
      body_md: body,
      choices: JSON.stringify(choices),
      answer: JSON.stringify(a.answer),
      explanation_md: a.explanation,
      is_numeric: false,
      copyright_status: 'cleared',
      published: true,
      is_applied: true,
    });
  }

  console.log(`parsed: ${records.length} records`);
  if (records.length !== 500) throw new Error(`expected 500, got ${records.length}`);

  const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
  try {
    console.log('clearing existing year=2099 (applied) rows...');
    const delA = await sql`delete from attempts where question_id in (select id from questions where year = 2099)`;
    const delQ = await sql`delete from questions where year = 2099`;
    console.log(`  deleted attempts=${delA.count}, questions=${delQ.count}`);

    console.log('inserting 500 applied questions...');
    // INSERT in batches
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const slice = records.slice(i, i + BATCH);
      await sql`insert into questions ${sql(
        slice,
        'year',
        'q_number',
        'section',
        'sub_topic',
        'difficulty',
        'body_md',
        'choices',
        'answer',
        'explanation_md',
        'is_numeric',
        'copyright_status',
        'published',
        'is_applied',
      )}`;
      inserted += slice.length;
      console.log(`  inserted: ${inserted}/${records.length}`);
    }

    const [{ total, published_count, applied_count }] = await sql`
      select count(*)::int as total,
             count(*) filter (where published = true)::int as published_count,
             count(*) filter (where is_applied = true and published = true)::int as applied_count
      from questions
    `;
    console.log(`\n=== summary ===`);
    console.log(`total=${total}, published=${published_count}, applied=${applied_count}`);

    const subTopics = await sql`
      select sub_topic, count(*)::int as c
      from questions where is_applied = true and published = true
      group by sub_topic order by c desc limit 20
    `;
    console.log(`\n=== top sub_topics ===`);
    for (const r of subTopics) console.log(`  ${r.sub_topic}: ${r.c}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
