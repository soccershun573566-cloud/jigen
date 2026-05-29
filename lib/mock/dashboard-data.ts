/**
 * モック層: UI 駆動開発用。将来 Supabase / API に差し替える。
 * 関数戻り値の型は types/domain.ts と整合させ、本物に置換しやすくする。
 */

import type { QuestionSection } from '@/types/domain';

// ----- ホーム (S05) -----

export type WeeklyDot = {
  /** ラベル(月/火/水/木/金/土/日) */
  label: string;
  /** その日に学習したか */
  studied: boolean;
  /** その日が「今日」か */
  isToday: boolean;
};

export type HomeSummary = {
  /** 累計学習日(ユウ§4.1: 連続日数の代替) */
  totalStudyDays: number;
  /** 今週の学習日数(7日中の n 日) */
  weekStudyDays: number;
  /** ウィークリーマップ(月→日の順) */
  weekMap: WeeklyDot[];
  /** AI 一言(2行・励まし禁止・観察ベース) */
  aiNote: string;
  /** 今日のタスク残り問題数 */
  remainingQuestions: number;
  /** 推定所要分 */
  estimatedMinutes: number;
  /** 最初に取り組む問題ID(モック UUID) */
  firstQuestionId: string;
};

export function getHomeSummary(): HomeSummary {
  return {
    totalStudyDays: 23,
    weekStudyDays: 4,
    weekMap: [
      { label: '月', studied: true, isToday: false },
      { label: '火', studied: true, isToday: false },
      { label: '水', studied: false, isToday: false },
      { label: '木', studied: true, isToday: false },
      { label: '金', studied: true, isToday: true },
      { label: '土', studied: false, isToday: false },
      { label: '日', studied: false, isToday: false },
    ],
    aiNote:
      '今週は躯体の数値判定で安定して取れています。\n今日は法規の改正論点を1問混ぜています。',
    remainingQuestions: 6,
    estimatedMinutes: 9,
    firstQuestionId: 'q-mock-0001',
  };
}

// ----- 演習 (S06) -----

export type PracticeChoice = {
  id: string;
  label: string;
};

export type PracticeQuestion = {
  id: string;
  /** 進捗: 今日のタスク中の何問目か / 全何問か */
  indexInTask: number;
  totalInTask: number;
  section: QuestionSection;
  subTopic: string;
  /** 問題本文(Markdown 想定だが MVP は plain で扱う) */
  body: string;
  choices: PracticeChoice[];
  /** 正解選択肢 ID(モック用に同梱。本番は別エンドポイント) */
  correctChoiceId: string;
  /** 正解時の短い解説 2-3 行 */
  correctNote: string;
  /** 不正解時の AI 観察コメント(モック) */
  aiMissNote: string;
};

const MOCK_QUESTIONS: Record<string, PracticeQuestion> = {
  'q-mock-0001': {
    id: 'q-mock-0001',
    indexInTask: 1,
    totalInTask: 6,
    section: '施工管理法',
    subTopic: '躯体_鉄筋',
    body:
      '鉄筋のかぶり厚さに関する記述として、最も適当なものはどれか。\n\nなお、設計図書に特記がないものとする。',
    choices: [
      { id: 'a', label: '柱の最小かぶり厚さは、設計かぶり厚さから 10mm を減じた値とする。' },
      { id: 'b', label: '基礎(捨てコンクリート部分を除く)のかぶり厚さは、60mm 以上とする。' },
      { id: 'c', label: '直接土に接する梁のかぶり厚さは、30mm 以上とする。' },
      { id: 'd', label: '屋根スラブのかぶり厚さは、20mm 以上とする。' },
    ],
    correctChoiceId: 'b',
    correctNote:
      '基礎(捨てコン除く)の最小かぶり厚さは 60mm。土に接する梁・壁は 40mm 以上が基本ライン。',
    aiMissNote:
      'かぶり厚さの「最小」と「設計」を取り違える誤答パターンです。\n設計かぶり = 最小かぶり + 10mm を起点に整理すると安定します。',
  },
};

export function getPracticeQuestion(questionId: string): PracticeQuestion {
  const q = MOCK_QUESTIONS[questionId];
  if (q) return q;
  // 未知 ID でも画面が見えるよう、テンプレを返す
  return {
    ...MOCK_QUESTIONS['q-mock-0001']!,
    id: questionId,
  };
}

/** 次の問題 ID(モック: 単純に末尾連番を進める) */
export function getNextQuestionId(currentId: string): string | null {
  const m = currentId.match(/(\d+)$/);
  if (!m) return null;
  const next = String(Number(m[1]) + 1).padStart(m[1]!.length, '0');
  const nextId = currentId.replace(/(\d+)$/, next);
  // モックでは 6 問で終了
  return Number(next) > 6 ? null : nextId;
}

// ----- 解説 (S07) -----

export type RelatedQuestion = {
  id: string;
  /** 「過去問」表記禁止 → 試験対策問題 */
  title: string;
  subTopic: string;
};

export type ExplanationData = {
  questionId: string;
  /** 公式解説 */
  official: string;
  /** AI による「あなた向け」補足(ユウ§7.3) */
  personalized: string;
  /** 関連問題 2 問 */
  related: RelatedQuestion[];
};

export function getExplanation(questionId: string): ExplanationData {
  return {
    questionId,
    official:
      '鉄筋のかぶり厚さは、JASS 5 および建築基準法施行令第 79 条に基づき、部位ごとに最小値が定められている。基礎(捨てコンクリート部分を除く)では 60mm 以上、直接土に接する柱・梁・壁・床では 40mm 以上、屋内仕上げのない床・屋根スラブでは 30mm 以上を確保する。設計かぶり厚さは、施工誤差を見込み最小かぶりに 10mm を加算して指定するのが標準である。',
    personalized:
      '直近 3 問でかぶり厚さに関する選択を 2 回間違えています。\n「最小」と「設計」が分かれている点が混線しやすい論点です。「設計=最小+10mm」だけ覚えれば、ほぼ片が付きます。',
    related: [
      {
        id: 'q-mock-0042',
        title: 'コンクリートの最小かぶり厚さに関する試験対策問題',
        subTopic: '躯体_鉄筋',
      },
      {
        id: 'q-mock-0058',
        title: '鉄筋の継手・定着長さに関する試験対策問題',
        subTopic: '躯体_鉄筋',
      },
    ],
  };
}

// ----- 振り返り (S08) -----

export type GrowingTopic = {
  subTopic: string;
  /** 先週比の改善度(pt) */
  deltaPt: number;
};

export type ReviewSummary = {
  /** 今日解いた問題数 */
  solvedCount: number;
  /** 今日の正答率(%) */
  accuracyPct: number;
  /** 先週比の差分(pt)。主役はこちら(ユウ§4.4) */
  accuracyDeltaPt: number;
  /** 伸びた単元 2-3 個 */
  growingTopics: GrowingTopic[];
  /** 明日のAIコメント 1 行 */
  tomorrowNote: string;
};

export function getReviewSummary(): ReviewSummary {
  return {
    solvedCount: 6,
    accuracyPct: 67,
    accuracyDeltaPt: 8,
    growingTopics: [
      { subTopic: '躯体_鉄筋', deltaPt: 12 },
      { subTopic: '仕上げ_左官', deltaPt: 9 },
      { subTopic: '安全管理', deltaPt: 5 },
    ],
    tomorrowNote: '明日は法規の改正論点を 2 問厚めにします。',
  };
}

// ----- S09 弱点ダッシュボード -----

export type MasteryField = {
  /** 分野名 */
  name: string;
  /** 習熟度(0-100) */
  mastery: number;
  /** その分野で解いた問題数 */
  attempted: number;
  /** 直近7日の伸び(pt) */
  recentDeltaPt: number;
};

export type GrowingUnit = {
  /** 単元名 */
  subTopic: string;
  /** 所属分野 */
  field: string;
  /** 現在の習熟度(0-100) */
  mastery: number;
  /** 想定上昇余地(pt)*/
  upsidePt: number;
  /** 重点演習の起点になる問題ID */
  startQuestionId: string;
};

export type MasterySummary = {
  fields: MasteryField[];
  growingTop3: GrowingUnit[];
  /** AIコメント 2行(励まし禁止・観察ベース) */
  nextFocusNote: string;
  /** 重点単元演習の起点問題ID */
  focusStartQuestionId: string;
};

export function getMasterySummary(): MasterySummary {
  return {
    fields: [
      { name: '躯体', mastery: 72, attempted: 48, recentDeltaPt: 6 },
      { name: '仕上げ', mastery: 58, attempted: 31, recentDeltaPt: 4 },
      { name: '施工管理法', mastery: 64, attempted: 52, recentDeltaPt: 3 },
      { name: '安全管理', mastery: 51, attempted: 22, recentDeltaPt: 8 },
      { name: '法規', mastery: 38, attempted: 18, recentDeltaPt: 2 },
      { name: '建築学一般', mastery: 67, attempted: 27, recentDeltaPt: 1 },
    ],
    growingTop3: [
      {
        subTopic: '法規_改正論点',
        field: '法規',
        mastery: 32,
        upsidePt: 22,
        startQuestionId: 'q-mock-0101',
      },
      {
        subTopic: '安全管理_足場',
        field: '安全管理',
        mastery: 44,
        upsidePt: 18,
        startQuestionId: 'q-mock-0121',
      },
      {
        subTopic: '仕上げ_防水',
        field: '仕上げ',
        mastery: 49,
        upsidePt: 15,
        startQuestionId: 'q-mock-0141',
      },
    ],
    nextFocusNote:
      '法規の改正論点は直近2週間で出題比率が上がっています。\n来週は安全管理の足場関連を厚めに組みます。',
    focusStartQuestionId: 'q-mock-0101',
  };
}

// ----- S10 週次レポート -----

export type WeeklyFieldDelta = {
  name: string;
  /** 先週比(pt) */
  deltaPt: number;
};

export type WeeklyExamCountdown = {
  /** 試験日が設定されているか */
  enabled: boolean;
  /** 残り日数(enabledのとき) */
  daysLeft: number;
  /** 今のペースで予測される到達率(%) */
  projectedReach: number;
};

export type WeeklySummary = {
  /** 7日間で解いた問題数 */
  solvedCount: number;
  /** 7日間の正答率(%) */
  accuracyPct: number;
  /** 先週比(pt) */
  accuracyDeltaPt: number;
  /** 先週の解いた問題数(差分表示用) */
  prevSolvedCount: number;
  /** 伸びた分野 上位 */
  improved: WeeklyFieldDelta[];
  /** 要強化分野(言い換え:伸びしろのある分野) */
  upcoming: WeeklyFieldDelta[];
  /** AIからの一言 2行 */
  aiNote: string;
  /** 試験日からの逆算進捗(任意) */
  countdown: WeeklyExamCountdown;
  /** 来週のタスクを確認CTAの遷移先 */
  nextWeekHref: string;
};

export function getWeeklySummary(): WeeklySummary {
  return {
    solvedCount: 47,
    accuracyPct: 62,
    accuracyDeltaPt: 8,
    prevSolvedCount: 38,
    improved: [
      { name: '仕上げ工事', deltaPt: 11 },
      { name: '安全管理', deltaPt: 7 },
    ],
    upcoming: [
      { name: '構造力学', deltaPt: 2 },
      { name: '法規_改正論点', deltaPt: 1 },
    ],
    aiNote:
      '数値判定の問題で安定して取れています。\n来週は躯体の数値問題を厚めに組みます。',
    countdown: {
      enabled: true,
      daysLeft: 142,
      projectedReach: 78,
    },
    nextWeekHref: '/home',
  };
}

// ----- S11 設定 -----

export type NotificationTime = {
  /** 朝の通知時刻 HH:mm */
  morning: string;
  /** 夜の通知時刻 HH:mm(未着手時のみ送信) */
  evening: string;
  /** 通知全体のオン/オフ */
  enabled: boolean;
};

export type SettingsSnapshot = {
  busyMode: boolean;
  /** 繁忙期モード継続日数(ユウ§4.3: 14日で確認) */
  busyModeDays: number;
  notifications: NotificationTime;
  /** 試験日(ISO yyyy-mm-dd / 未設定なら null) */
  examDate: string | null;
  /** お休み登録の今月使用回数 / 上限 */
  restUsed: number;
  restLimit: number;
  /** アカウントメール(表示専用)*/
  email: string;
  /** 現在プラン */
  plan: 'trial' | 'free' | 'monthly' | 'annual';
  /** トライアル残日数(plan === 'trial' のときのみ意味あり) */
  trialDaysLeft: number;
};

export function getSettingsSnapshot(): SettingsSnapshot {
  return {
    busyMode: false,
    busyModeDays: 0,
    notifications: {
      morning: '07:00',
      evening: '21:30',
      enabled: true,
    },
    examDate: '2026-10-18',
    restUsed: 1,
    restLimit: 3,
    email: 'takashi.k@example.com',
    plan: 'trial',
    trialDaysLeft: 4,
  };
}

// ----- S12 課金 -----

export type BillingTrialReport = {
  /** トライアル中に解いた問題数 */
  solvedCount: number;
  /** トライアル中の正答率(%) */
  accuracyPct: number;
  /** 期間中に伸びた分野(具体名) */
  improvedFields: string[];
  /** 現状ペースの合格圏到達率(%) */
  projectedReach: number;
};

export type BillingPlan = {
  id: 'monthly' | 'annual';
  label: string;
  priceJpy: number;
  /** 月換算(年プランの注釈表示用) */
  monthlyEquivalentJpy?: number;
  /** 期間表示("月" / "年") */
  cycle: '月' | '年';
  /** 短い説明1行 */
  note: string;
};

export type BillingSnapshot = {
  report: BillingTrialReport;
  plans: BillingPlan[];
  /** Free 継続を選んだ場合の遷移先 */
  freeHref: string;
};

export function getBillingSnapshot(): BillingSnapshot {
  return {
    report: {
      solvedCount: 38,
      accuracyPct: 61,
      improvedFields: ['仕上げ_左官', '躯体_鉄筋'],
      projectedReach: 72,
    },
    plans: [
      {
        id: 'monthly',
        label: '月プラン',
        priceJpy: 2980,
        cycle: '月',
        note: '個別最適化AI・伸びしろフォローを継続',
      },
      {
        id: 'annual',
        label: '年プラン',
        priceJpy: 24800,
        monthlyEquivalentJpy: 2067,
        cycle: '年',
        note: '同機能。月換算で抑える選択肢',
      },
    ],
    freeHref: '/home?plan=free',
  };
}
