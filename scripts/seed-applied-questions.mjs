// 応用能力(五肢二択) 30問 を questions に追加投入
// 既存 1425件はそのまま、year=2099 のレコードのみ delete & 再投入(冪等)
import fs from 'node:fs';
import postgres from 'postgres';

const CSV_PATH = 'C:\\Users\\user\\Desktop\\jigen_applied_import.csv';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

function parseCsv(content) {
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const rows = []; let i = 0; const len = content.length;
  let row = []; let cell = ''; let inQuotes = false;
  while (i < len) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') { cell += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { cell += c; i++; }
    } else {
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ',') { row.push(cell); cell = ''; i++; }
      else if (c === '\r') { i++; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
      else { cell += c; i++; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(content);
  const header = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.length >= header.length && r[0] !== '');
  console.log(`data rows: ${dataRows.length}`);

  console.log('clearing existing year=2099 (applied) rows...');
  await sql`delete from attempts where question_id in (select id from questions where year = 2099)`;
  await sql`delete from questions where year = 2099`;

  const records = dataRows.map((r) => {
    const [year, q_number, section, sub_topic, body_md, choices, answer, explanation_md, copyright_status, published] = r;
    return {
      year: Number(year),
      q_number: Number(q_number),
      section,
      sub_topic,
      body_md,
      choices: JSON.parse(choices),
      answer: JSON.parse(answer),
      explanation_md,
      copyright_status,
      published: published === 'true',
    };
  });

  console.log('inserting applied questions...');
  await sql`insert into questions ${sql(records, 'year', 'q_number', 'section', 'sub_topic', 'body_md', 'choices', 'answer', 'explanation_md', 'copyright_status', 'published')}`;
  console.log(`  inserted: ${records.length} rows`);

  const [{ total, published_count, applied_count }] = await sql`
    select count(*)::int as total,
           count(*) filter (where published = true)::int as published_count,
           count(*) filter (where year = 2099)::int as applied_count
    from questions
  `;
  console.log(`total=${total}, published=${published_count}, applied(year=2099)=${applied_count}`);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
