import postgres from 'postgres';
const sql = postgres('postgres://postgres.evouggwasjyoudotafld:Shun57ori3566@aws-1-ap-south-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });

try {
  console.log('=== users にオンボーディング項目を追加 ===');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamptz`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS attempt_history text`;  // 'first' | 'failed_once' | 'failed_multi'
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS study_style text`;  // 'self' | 'cram_school' | 'online'
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS strong_sections jsonb DEFAULT '[]'::jsonb`;  // 自信のある教科(配列)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS weak_section text`;  // 一番苦手な教科

  // 確認
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('onboarded_at','attempt_history','study_style','strong_sections','weak_section')
    ORDER BY column_name
  `;
  console.log('追加されたカラム:');
  for (const c of cols) {
    console.log(`  - ${c.column_name}: ${c.data_type}`);
  }
  console.log('✅ マイグレーション完了');
} catch (err) {
  console.error('❌ エラー:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
