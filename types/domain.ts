/**
 * ドメイン型(DB スキーマや API から独立した、ビジネスロジック共通の型)
 * BKT/SRS 境界などはここから export して lib/learning が依存する。
 */

export type QuestionSection = '建築学一般' | '施工管理法' | '法規' | 'その他';

export type ChoiceQuestion = {
  type: 'choice';
  items: string[];
};

export type NumericQuestion = {
  type: 'numeric';
};

export type QuestionChoices = ChoiceQuestion | NumericQuestion;

export type AttemptResult = {
  isCorrect: boolean;
  isNearMiss: boolean; // 数値問題で許容誤差外だが近い
  responseSeconds: number;
  confidence?: 1 | 2 | 3;
};

// BKT 入出力(ガクとの境界 — 技術構築計画§11.2)
export type BktInput = {
  pL: number;
  isCorrect: boolean;
  subTopic: string;
};

export type BktOutput = {
  pL: number;
  nextReviewAt: Date;
};

export type DailyTaskComposition = {
  new: number;
  review: number;
  weak: number;
};
