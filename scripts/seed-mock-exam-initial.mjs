import postgres from 'postgres';
import fs from 'node:fs';

const DATABASE_URL = 'postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const data = JSON.parse(fs.readFileSync(
  'C:/Users/user/Desktop/ティラノ資格学校/projects/P001_セコカン1級/code/jigen/data/mock_exam_initial.json',
  'utf8',
));

try {
  console.log('=== Schema 確認 ===');
  // mock_exams テーブルが存在するか確認、なければ作成
  await sql`
    CREATE TABLE IF NOT EXISTS mock_exams (
      id text PRIMARY KEY,
      title text NOT NULL,
      description text,
      questions_count integer NOT NULL,
      available_from timestamptz,
      available_until timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      one_time boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS mock_exam_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mock_exam_id text NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
      question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      order_index integer NOT NULL
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mock_exam_questions_unique
    ON mock_exam_questions (mock_exam_id, order_index)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS mock_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mock_exam_id text NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      current_question_index integer NOT NULL DEFAULT 0,
      answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      score integer,
      section_scores jsonb
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mock_attempts_user_exam_unique
    ON mock_attempts (user_id, mock_exam_id)
  `;
  console.log('✅ Schema 作成完了');

  console.log('=== mock_exams 登録 ===');
  await sql`
    INSERT INTO mock_exams (id, title, description, questions_count, is_active, one_time)
    VALUES (${data.mock_exam_id}, ${data.title}, ${data.description}, ${data.questions_count}, true, true)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      questions_count = EXCLUDED.questions_count,
      is_active = EXCLUDED.is_active
  `;
  console.log(`✅ mock_exam: ${data.mock_exam_id}`);

  console.log('=== 既存の mock_exam_questions クリア ===');
  await sql`DELETE FROM mock_exam_questions WHERE mock_exam_id = ${data.mock_exam_id}`;

  console.log('=== 50問を questions テーブルに投入 + 模試関連付け ===');
  let inserted = 0;
  for (const q of data.questions) {
    // 模試問題は year=9999 + q_number=mock_initial_{n} で識別(本試験問題と分離)
    const fakeYear = 9999;
    const fakeQNumber = 10000 + q.q_number; // 1-50 → 10001-10050

    // questions テーブルに insert(upsert)
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

    // mock_exam_questions に関連付け
    await sql`
      INSERT INTO mock_exam_questions (mock_exam_id, question_id, order_index)
      VALUES (${data.mock_exam_id}, ${questionId}::uuid, ${q.q_number})
    `;
    inserted++;
  }
  console.log(`✅ ${inserted}問 投入完了`);

  console.log('\n=== 確認 ===');
  const count = await sql`
    SELECT COUNT(*) as n FROM mock_exam_questions WHERE mock_exam_id = ${data.mock_exam_id}
  `;
  console.log(`mock_exam_questions: ${count[0].n}件`);
} catch (err) {
  console.error('❌ エラー:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
