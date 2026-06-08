import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

const inputPath = 'C:/Users/user/Desktop/1級建築施工管理_現状把握模試.xlsx';
const outputPath = 'C:/Users/user/Desktop/ティラノ資格学校/projects/P001_セコカン1級/code/jigen/data/mock_exam_initial.json';

// ジゲン question_section enum へのマッピング
function mapSection(field) {
  if (!field) return 'その他';
  const s = String(field);
  if (s.includes('建築学') || s.includes('計画') || s.includes('構造') || s.includes('材料') || s.includes('設備')) return '建築学一般';
  if (s.includes('施工') && !s.includes('法')) return '施工管理法';
  if (s.includes('管理') || s.includes('工程') || s.includes('品質') || s.includes('安全') || s.includes('施工管理')) return '施工管理法';
  if (s.includes('法規') || s.includes('法令') || s.includes('労働') || s.includes('建設業')) return '法規';
  return 'その他';
}

const wb = XLSX.readFile(inputPath);
const probSheet = XLSX.utils.sheet_to_json(wb.Sheets['問題'], { header: 1, defval: '', raw: false });
const ansSheet = XLSX.utils.sheet_to_json(wb.Sheets['解答・解説'], { header: 1, defval: '', raw: false });

// ヘッダー除く
const probs = probSheet.slice(1);
const answers = ansSheet.slice(1);

// 解答シートをNo→answerでmap
const ansByNo = {};
for (const row of answers) {
  const no = String(row[0]).trim();
  if (!no) continue;
  ansByNo[no] = {
    section: row[1],
    sub_topic: row[2],
    answer: parseInt(String(row[3]).trim(), 10),
    explanation: String(row[4]).trim(),
    source: String(row[5]).trim(),
  };
}

// 問題とマージ
const questions = [];
for (const row of probs) {
  const no = String(row[0]).trim();
  if (!no) continue;
  const ans = ansByNo[no];
  if (!ans) {
    console.warn(`No.${no}: 解答が見つかりません`);
    continue;
  }
  const choices = [row[4], row[5], row[6], row[7]].map(c => String(c).trim());
  if (!Number.isFinite(ans.answer) || ans.answer < 1 || ans.answer > 4) {
    console.warn(`No.${no}: 解答が不正(${ans.answer})`);
    continue;
  }
  questions.push({
    year: 2026,
    q_number: parseInt(no, 10),
    section: mapSection(row[1]),
    section_original: String(row[1]).trim(),
    sub_topic: String(row[2]).trim(),
    difficulty: 0.5,
    body_md: String(row[3]).trim(),
    choices,
    answer: { value: ans.answer },
    explanation_md: ans.explanation,
    explanation_source: ans.source,
    is_numeric: false,
  });
}

const out = {
  mock_exam_id: 'initial-50',
  title: '1級建築施工管理 現状把握模試(50問)',
  description: 'β版登録者向け 初回診断模試。 受験後の結果から弱点プロファイルを自動生成し、 翌日からのAI出題に反映される。',
  questions_count: questions.length,
  questions,
};

// 出力ディレクトリ確保
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`✅ ${questions.length}問抽出 → ${outputPath}`);

// セクション分布
const dist = {};
for (const q of questions) {
  dist[q.section] = (dist[q.section] ?? 0) + 1;
}
console.log('\n=== セクション分布 ===');
console.log(JSON.stringify(dist, null, 2));

// 元のsection表記の分布(マッピング検証用)
const origDist = {};
for (const q of questions) {
  origDist[q.section_original] = (origDist[q.section_original] ?? 0) + 1;
}
console.log('\n=== 元の分野表記 ===');
console.log(JSON.stringify(origDist, null, 2));
