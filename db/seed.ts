/**
 * シードデータ投入スクリプト
 * 実行: pnpm db:seed
 *
 * ダミー過去問10問(技術構築計画§9 木曜 TODO)。
 * 監修者(E007)による本物のデータが揃うまでの開発用。
 */
import 'dotenv/config';
import { db } from '@/lib/db';
import { questions } from './schema';

const dummyQuestions = [
  {
    year: 2024,
    qNumber: 1,
    section: '建築学一般' as const,
    subTopic: '構造力学',
    difficulty: 0.4,
    bodyMd: '単純梁の中央集中荷重 P によるたわみの式として正しいものを選べ。',
    choices: { type: 'choice', items: ['PL/3EI', 'PL³/48EI', 'PL²/16EI', 'PL/8EI'] },
    answer: { value: 'PL³/48EI' },
    explanationMd: '単純梁中央集中荷重のたわみは δ = PL³ / (48EI)。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2024,
    qNumber: 2,
    section: '施工管理法' as const,
    subTopic: '工程管理',
    difficulty: 0.5,
    bodyMd: 'ネットワーク工程表のクリティカルパスの説明として正しいものはどれか。',
    choices: { type: 'choice', items: ['総余裕日数最大の経路', '総余裕日数ゼロの経路', '最短経路', '最早開始日と最遅開始日が異なる経路'] },
    answer: { value: '総余裕日数ゼロの経路' },
    explanationMd: 'クリティカルパスは総余裕日数(TF)がゼロとなる経路。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2024,
    qNumber: 3,
    section: '施工管理法' as const,
    subTopic: '躯体',
    difficulty: 0.55,
    bodyMd: '鉄筋コンクリート造のかぶり厚さに関する記述で誤っているものはどれか。',
    choices: { type: 'choice', items: ['屋内の柱では3cm以上', '土に接する部分は4cm以上', 'かぶり厚さは鉄筋表面からコンクリート表面まで', 'かぶり厚さは主筋の中心まで'] },
    answer: { value: 'かぶり厚さは主筋の中心まで' },
    explanationMd: 'かぶり厚さは鉄筋表面からコンクリート表面までの最短距離。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2024,
    qNumber: 4,
    section: '施工管理法' as const,
    subTopic: '仕上げ',
    difficulty: 0.45,
    bodyMd: 'タイル張り工法のうち、密着張り工法の特徴として最も適切なものはどれか。',
    choices: { type: 'choice', items: ['振動工具を用いる', 'モルタル不要', '大判タイル専用', '半乾式工法'] },
    answer: { value: '振動工具を用いる' },
    explanationMd: '密着張り工法はビブラート(振動工具)で張付けモルタルにタイルを埋め込む。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2024,
    qNumber: 5,
    section: '法規' as const,
    subTopic: '建築基準法',
    difficulty: 0.6,
    bodyMd: '建築基準法における主要構造部に含まれないものはどれか。',
    choices: { type: 'choice', items: ['壁', '柱', '基礎', '床'] },
    answer: { value: '基礎' },
    explanationMd: '主要構造部は壁・柱・床・はり・屋根・階段。基礎は構造耐力上主要な部分だが主要構造部ではない。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2023,
    qNumber: 1,
    section: '建築学一般' as const,
    subTopic: '材料',
    difficulty: 0.5,
    bodyMd: '普通ポルトランドセメントの粉末度が大きい場合の性質として正しいものはどれか。',
    choices: { type: 'choice', items: ['水和反応が遅い', '初期強度が高い', '収縮が小さい', '発熱量が小さい'] },
    answer: { value: '初期強度が高い' },
    explanationMd: '粉末度が大きい(細かい)ほど比表面積が増え水和反応が速く初期強度が高い。同時に収縮・発熱は増える。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2023,
    qNumber: 2,
    section: '施工管理法' as const,
    subTopic: '安全管理',
    difficulty: 0.4,
    bodyMd: '高さ 2m 以上の作業床における手すりの高さの最低基準として正しいものはどれか。',
    choices: { type: 'choice', items: ['75cm', '85cm', '95cm', '105cm'] },
    answer: { value: '85cm' },
    explanationMd: '労働安全衛生規則上、作業床(高さ2m以上)の手すりは85cm以上。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2023,
    qNumber: 3,
    section: '施工管理法' as const,
    subTopic: '躯体',
    difficulty: 0.65,
    bodyMd: 'コンクリートの調合強度 Fc が 24N/mm² のとき、現場水中養生供試体の管理材齢28日強度が満たすべき値はおよそいくつか(N/mm²)。',
    choices: { type: 'numeric' },
    answer: { value: 24 },
    explanationMd: '管理材齢28日強度は Fc を下回らないこと。許容誤差±1で 24N/mm² 前後。',
    isNumeric: true,
    numericTolerance: 1.0,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2023,
    qNumber: 4,
    section: '法規' as const,
    subTopic: '労働安全衛生法',
    difficulty: 0.55,
    bodyMd: '足場の組立て等作業主任者が必要となる足場の高さの最低値は何メートルか。',
    choices: { type: 'numeric' },
    answer: { value: 5 },
    explanationMd: '労働安全衛生法上、つり足場・張出し足場・高さ5m以上の構造の足場の組立て等作業には作業主任者が必要。',
    isNumeric: true,
    numericTolerance: 0,
    copyrightStatus: 'pending' as const,
    published: true,
  },
  {
    year: 2023,
    qNumber: 5,
    section: '建築学一般' as const,
    subTopic: '環境工学',
    difficulty: 0.5,
    bodyMd: '居室の必要換気量を求める指標として最も一般的なものはどれか。',
    choices: { type: 'choice', items: ['一酸化炭素濃度', '二酸化炭素濃度', '酸素濃度', '湿度'] },
    answer: { value: '二酸化炭素濃度' },
    explanationMd: '建築物衛生法は居室の二酸化炭素濃度 1000ppm 以下を基準とする。',
    isNumeric: false,
    copyrightStatus: 'pending' as const,
    published: true,
  },
];

async function main() {
  console.info('[seed] inserting %d dummy questions...', dummyQuestions.length);
  await db.insert(questions).values(dummyQuestions).onConflictDoNothing();
  console.info('[seed] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
