import postgres from 'postgres';
import fs from 'node:fs';

const DATABASE_URL = 'postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const data = JSON.parse(fs.readFileSync(
  'C:/Users/user/Desktop/ティラノ資格学校/projects/P001_セコカン1級/code/jigen/data/mock_exam_pre_exam.json',
  'utf8',
));

try {
  console.log('=== mock_exams 登録(直前模試) ===');
  await sql`
    INSERT INTO mock_exams (id, title, description, questions_count, available_from, available_until, is_active, one_time)
    VALUES (
      ${data.mock_exam_id},
      ${data.title},
      ${data.description},
      ${data.questions_count},
      ${data.available_from}::timestamptz,
      ${data.available_until}::timestamptz,
      true,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      questions_count = EXCLUDED.questions_count,
      available_from = EXCLUDED.available_from,
      available_until = EXCLUDED.available_until,
      is_active = EXCLUDED.is_active
  `;
  console.log(`✅ mock_exam: ${data.mock_exam_id}`);

  await sql`DELETE FROM mock_exam_questions WHERE mock_exam_id = ${data.mock_exam_id}`;

  console.log('=== 50問投入(直前模試・year=9998・q_number=20001-20050で識別) ===');
  let inserted = 0;
  for (const q of data.questions) {
    const fakeYear = 9998; // 直前模試は year=9998 で本試験問題と区別
    const fakeQNumber = 20000 + q.q_number; // 1-50 → 20001-20050

    const result = await sql`
      INSERT INTO questions (
        year, q_number, section, sub_topic, difficulty, body_md,
        choices, answer, explanation_md, is_numeric, copyright_status, published
      )
      VALUES (
        ${fakeYear}, ${fakeQNumber}, ${q.section}::question_section, ${q.sub_topic},
        ${q.difficulty}, ${q.body_md}, ${JSON.stringify(q.choices)}::jsonb,
        ${JSON.stringify(q.answer)}::jsonb, ${q.explanation_md}, ${q.is_numeric},
        'cleared'::copyright_status, true
      )
      ON CONFLICT (year, q_number) DO UPDATE SET
        section = EXCLUDED.section,
        sub_topic = EXCLUDED.sub_topic,
        body_md = EXCLUDED.body_md,
        choices = EXCLUDED.choices,
        answer = EXCLUDED.answer,
        explanation_md = EXCLUDED.explanation_md,
        updated_at = now()
      RETURNING id
    `;
    const questionId = result[0].id;

    await sql`
      INSERT INTO mock_exam_questions (mock_exam_id, question_id, order_index)
      VALUES (${data.mock_exam_id}, ${questionId}::uuid, ${q.q_number})
    `;
    inserted++;
  }
  console.log(`✅ ${inserted}問 投入完了`);

  const count = await sql`
    SELECT COUNT(*) as n FROM mock_exam_questions WHERE mock_exam_id = ${data.mock_exam_id}
  `;
  console.log(`\nmock_exam_questions: ${count[0].n}件`);
} catch (err) {
  console.error('❌ エラー:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
