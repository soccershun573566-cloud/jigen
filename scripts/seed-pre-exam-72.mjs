// 本番直前模試 72問(本番再現版・一般66+応用6) を投入
//   ・year=9998 を pre-exam 識別用に使用(既存慣例)
//   ・q_number=20001〜20072
//   ・既存 year=9998 と mock_exam_questions(pre-exam-2026-07) を全削除して再投入
//   ・is_applied: 形式が「応用(2つ)」 のもの true
//   ・section: 「建築学*」 → 建築学一般 / 「躯体施工」 「仕上施工」 「施工管理」 「施工管理法(応用能力)」 → 施工管理法 / 「法規」 → 法規
import xlsx from 'xlsx';
import postgres from 'postgres';

const XLSX_PATH = 'C:\\Users\\user\\Documents\\Claude\\Projects\\1級施工管理技士\\1級建築施工管理_本番直前模試.xlsx';
const MOCK_EXAM_ID = 'pre-exam-2026-07';
const YEAR_TAG = 9998;
const Q_NUMBER_BASE = 20000;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

function mapSection(field) {
  if (field.startsWith('建築学')) return '建築学一般';
  if (field === '法規') return '法規';
  return '施工管理法';
}

function parseAnswerForApplied(s) {
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

  // ans index by No
  const ansByNo = new Map();
  for (let i = 1; i < aSheet.length; i++) {
    const r = aSheet[i];
    if (!r[0]) continue;
    ansByNo.set(Number(r[0]), {
      format: String(r[3] || '').trim(),  // 「四肢」 / 「応用(2つ)」
      answer: r[4],
      explanation: String(r[5] || '').trim(),
    });
  }

  const records = [];
  for (let i = 1; i < qSheet.length; i++) {
    const r = qSheet[i];
    if (!r[0]) continue;
    const no = Number(r[0]);
    const field = String(r[1] || '').trim();
    const sub = String(r[2] || '').trim();
    const body = String(r[3] || '').trim();
    const c1 = String(r[4] || '').trim();
    const c2 = String(r[5] || '').trim();
    const c3 = String(r[6] || '').trim();
    const c4 = String(r[7] || '').trim();
    const c5 = String(r[8] || '').trim();

    const a = ansByNo.get(no);
    if (!a) throw new Error(`No.${no}: answer not found`);

    const isApplied = a.format === '応用(2つ)';
    let choices, answer;

    if (isApplied) {
      // 五肢二択(応用)
      const parsedAns = parseAnswerForApplied(a.answer);
      if (parsedAns.length !== 2) throw new Error(`No.${no}: applied answer parse failed: ${a.answer}`);
      if (!c5) throw new Error(`No.${no}: applied but choice5 empty`);
      choices = [c1, c2, c3, c4, c5];
      answer = parsedAns;
    } else {
      // 四肢択一
      const ansNum = Number(a.answer);
      if (!Number.isFinite(ansNum)) throw new Error(`No.${no}: yon answer parse failed: ${a.answer}`);
      if (c5) console.warn(`No.${no}: yon problem but choice5 present (ignored): "${c5}"`);
      choices = [c1, c2, c3, c4];
      answer = { value: ansNum };
    }

    records.push({
      year: YEAR_TAG,
      q_number: Q_NUMBER_BASE + no,
      section: mapSection(field),
      sub_topic: `${field}/${sub}`,
      difficulty: isApplied ? 0.7 : 0.5,
      body_md: body,
      choices,
      answer,
      explanation_md: a.explanation,
      is_numeric: false,
      copyright_status: 'cleared',
      published: true,
      is_applied: isApplied,
    });
  }

  console.log(`parsed: ${records.length} records (applied=${records.filter(r => r.is_applied).length}, general=${records.filter(r => !r.is_applied).length})`);
  if (records.length !== 72) throw new Error(`expected 72, got ${records.length}`);

  const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
  try {
    console.log('\n--- clearing existing pre-exam data ---');
    // 1) mock_exam_questions: pre-exam に紐づく行を削除
    const delMeq = await sql`delete from mock_exam_questions where mock_exam_id = ${MOCK_EXAM_ID}`;
    console.log(`  deleted mock_exam_questions: ${delMeq.count}`);
    // 2) attempts: source='mock_pre-exam-2026-07' のものを削除(汚染防止)
    const delAtt = await sql`delete from attempts where source = ${`mock_${MOCK_EXAM_ID}`}`;
    console.log(`  deleted attempts (source=mock_${MOCK_EXAM_ID}): ${delAtt.count}`);
    // 3) mock_attempts: 旧受験記録があれば削除
    const delMa = await sql`delete from mock_attempts where mock_exam_id = ${MOCK_EXAM_ID}`;
    console.log(`  deleted mock_attempts: ${delMa.count}`);
    // 4) questions の year=9998 を削除(他で参照されてないため安全)
    const delAttQ = await sql`delete from attempts where question_id in (select id from questions where year = ${YEAR_TAG})`;
    console.log(`  deleted lingering attempts on year=${YEAR_TAG}: ${delAttQ.count}`);
    const delQ = await sql`delete from questions where year = ${YEAR_TAG}`;
    console.log(`  deleted questions (year=${YEAR_TAG}): ${delQ.count}`);

    console.log('\n--- inserting new 72 pre-exam questions ---');
    // jsonb 列に渡す値は JSON.stringify 済の文字列だと既存通常問題と同様の格納形式になる
    const recordsForInsert = records.map((r) => ({
      ...r,
      choices: JSON.stringify(r.choices),
      answer: JSON.stringify(r.answer),
    }));
    const inserted = await sql`
      insert into questions ${sql(
        recordsForInsert,
        'year', 'q_number', 'section', 'sub_topic', 'difficulty',
        'body_md', 'choices', 'answer', 'explanation_md',
        'is_numeric', 'copyright_status', 'published', 'is_applied',
      )} returning id, q_number, is_applied
    `;
    console.log(`  inserted questions: ${inserted.length}`);

    console.log('\n--- linking to mock_exam_questions ---');
    const linkRows = inserted
      .sort((a, b) => a.q_number - b.q_number)
      .map((q, idx) => ({
        mock_exam_id: MOCK_EXAM_ID,
        question_id: q.id,
        order_index: idx + 1,
      }));
    await sql`insert into mock_exam_questions ${sql(linkRows, 'mock_exam_id', 'question_id', 'order_index')}`;
    console.log(`  linked: ${linkRows.length} rows`);

    console.log('\n--- updating mock_exams.questions_count ---');
    await sql`update mock_exams set questions_count = 72 where id = ${MOCK_EXAM_ID}`;

    const summary = await sql`
      select count(*)::int as total,
             count(*) filter (where q.is_applied = true)::int as applied,
             count(*) filter (where q.is_applied = false)::int as general
      from mock_exam_questions meq
      join questions q on q.id = meq.question_id
      where meq.mock_exam_id = ${MOCK_EXAM_ID}
    `;
    console.log('\n=== summary ===');
    console.log(JSON.stringify(summary[0], null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
