// オリジナル問題集 1425件 を Supabase に投入
//   1) attempts / mastery_profiles / questions を削除
//   2) CSV を読み込んで questions に bulk insert
//   3) 件数確認
//
// 実行: DATABASE_URL=... node scripts/seed-original-questions.mjs

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const CSV_PATH = 'C:\\Users\\user\\Desktop\\jigen_original_import.csv';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

function parseCsv(content) {
  // BOM 除去
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  const rows = [];
  let i = 0;
  const len = content.length;
  let row = [];
  let cell = '';
  let inQuotes = false;
  while (i < len) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cell += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
        i++;
      } else if (c === '\r') {
        i++;
      } else if (c === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
      } else {
        cell += c;
        i++;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, max: 5 });

  console.log('reading CSV:', CSV_PATH);
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(content);
  const header = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.length >= header.length && r[0] !== '');
  console.log(`header columns: ${header.join(', ')}`);
  console.log(`data rows: ${dataRows.length}`);

  console.log('\n[1/3] clearing existing data...');
  await sql`delete from attempts`;
  await sql`delete from mastery_profiles`;
  await sql`delete from questions`;
  console.log('  done');

  console.log('\n[2/3] inserting original questions (batch)...');
  const records = dataRows.map((r) => {
    const [
      year,
      q_number,
      section,
      sub_topic,
      body_md,
      choices,
      answer,
      explanation_md,
      copyright_status,
      published,
    ] = r;
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

  const BATCH = 100;
  let inserted = 0;
  for (let off = 0; off < records.length; off += BATCH) {
    const slice = records.slice(off, off + BATCH);
    await sql`insert into questions ${sql(slice, 'year', 'q_number', 'section', 'sub_topic', 'body_md', 'choices', 'answer', 'explanation_md', 'copyright_status', 'published')}`;
    inserted += slice.length;
    process.stdout.write(`  inserted ${inserted}/${records.length}\r`);
  }
  console.log(`\n  done: ${inserted} rows`);

  console.log('\n[3/3] verifying...');
  const [{ total, published_count }] = await sql`
    select count(*)::int as total, count(*) filter (where published = true)::int as published_count
    from questions
  `;
  console.log(`  total = ${total}, published = ${published_count}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
