import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

const inputPath = 'C:/Users/user/Desktop/1級建築施工管理_本番直前模試.xlsx';
const outputPath = 'C:/Users/user/Desktop/ティラノ資格学校/projects/P001_セコカン1級/code/jigen/data/mock_exam_pre_exam.json';

function mapSection(field) {
  if (!field) return 'その他';
  const s = String(field);
  if (s.includes('建築学') || s.includes('計画') || s.includes('構造') || s.includes('材料') || s.includes('設備')) return '建築学一般';
  if (s.includes('施工') && !s.includes('法')) return '施工管理法';
  if (s.includes('管理') || s.includes('工程') || s.includes('品質') || s.includes('安全')) return '施工管理法';
  if (s.includes('法規') || s.includes('法令') || s.includes('労働') || s.includes('建設業')) return '法規';
  return 'その他';
}

const wb = XLSX.readFile(inputPath);
const probs = XLSX.utils.sheet_to_json(wb.Sheets['問題'], { header: 1, defval: '', raw: false }).slice(1);
const ans = XLSX.utils.sheet_to_json(wb.Sheets['解答・解説'], { header: 1, defval: '', raw: false }).slice(1);

const ansByNo = {};
for (const r of ans) {
  const no = String(r[0]).trim();
  if (!no) continue;
  ansByNo[no] = {
    section: r[1], sub_topic: r[2],
    answer: parseInt(String(r[3]).trim(), 10),
    explanation: String(r[4]).trim(), source: String(r[5]).trim(),
  };
}

const questions = [];
for (const r of probs) {
  const no = String(r[0]).trim();
  if (!no) continue;
  const a = ansByNo[no];
  if (!a || !Number.isFinite(a.answer)) continue;
  questions.push({
    year: 2026, q_number: parseInt(no, 10),
    section: mapSection(r[1]),
    section_original: String(r[1]).trim(),
    sub_topic: String(r[2]).trim(),
    difficulty: 0.5,
    body_md: String(r[3]).trim(),
    choices: [r[4], r[5], r[6], r[7]].map(c => String(c).trim()),
    answer: { value: a.answer },
    explanation_md: a.explanation,
    explanation_source: a.source,
    is_numeric: false,
  });
}

const out = {
  mock_exam_id: 'pre-exam-2026-07',
  title: '1級建築施工管理 本番直前模試(50問)',
  description: '2026年7月の1次試験を直前に控えたβテスター限定の本番形式模試。 開催期間: 2026年7月1日(水)〜7月14日(火)。',
  available_from: '2026-07-01T00:00:00+09:00',
  available_until: '2026-07-14T23:59:59+09:00',
  questions_count: questions.length,
  questions,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`✅ ${questions.length}問抽出 → ${outputPath}`);

const dist = {};
for (const q of questions) dist[q.section] = (dist[q.section] ?? 0) + 1;
console.log('セクション分布:', dist);
