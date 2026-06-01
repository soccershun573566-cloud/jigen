/**
 * API I/O 型 — zod スキーマで定義
 * 技術構築計画§11.2 ナギ・ガクとの境界
 * camelCase 統一(DB の snake_case とは Drizzle のカラム別名で変換)
 */
import { z } from 'zod';

// ============ /api/me ============
export const MeResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  weekdayMinutes: z.number(),
  weekendMinutes: z.number(),
  targetExamDate: z.string().nullable(),
  streakCount: z.number(),
  totalStudyDays: z.number(),
  recoveryTokens: z.number(),
  busyModeUntil: z.string().nullable(),
  subscription: z.object({
    plan: z.enum(['monthly', 'yearly', 'free']),
    status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'free']),
    trialEndsAt: z.string().nullable(),
    currentPeriodEnd: z.string().nullable(),
  }),
});
export type MeResponse = z.infer<typeof MeResponse>;

// ============ /api/diagnosis/submit ============
export const DiagnosisAnswer = z.object({
  questionId: z.string().uuid(),
  subTopic: z.string(),
  isCorrect: z.boolean(),
});
export type DiagnosisAnswer = z.infer<typeof DiagnosisAnswer>;

export const DiagnosisSubmitRequest = z.object({
  answers: z.array(DiagnosisAnswer).min(1).max(30),
  weekdayMinutes: z.number().int().min(5).max(240),
  weekendMinutes: z.number().int().min(5).max(480),
  targetExamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type DiagnosisSubmitRequest = z.infer<typeof DiagnosisSubmitRequest>;

export const DiagnosisSubmitResponse = z.object({
  weakTopTopics: z.array(z.string()),
  estimatedDaysToReady: z.number(),
  todayTaskId: z.string().uuid(),
});
export type DiagnosisSubmitResponse = z.infer<typeof DiagnosisSubmitResponse>;

// ============ /api/tasks/today ============
export const TaskTodayResponse = z.object({
  id: z.string().uuid(),
  targetDate: z.string(),
  questionIds: z.array(z.string().uuid()),
  composition: z.object({
    new: z.number(),
    review: z.number(),
    weak: z.number(),
  }),
  reasonMd: z.string().nullable(),
  estimatedMinutes: z.number(),
  completedAt: z.string().nullable(),
});
export type TaskTodayResponse = z.infer<typeof TaskTodayResponse>;

// ============ /api/questions/[id] ============
export const QuestionResponse = z.object({
  id: z.string().uuid(),
  year: z.number(),
  qNumber: z.number(),
  section: z.string(),
  subTopic: z.string(),
  difficulty: z.number(),
  bodyMd: z.string(),
  choices: z.unknown(),
  isNumeric: z.boolean(),
  // answer / explanationMd は POST /attempts 後に取得
});
export type QuestionResponse = z.infer<typeof QuestionResponse>;

// ============ /api/practice/next ============
// ハルの route.ts に対応。Question 1件 + 残数メタ。
export const PracticeNextResponse = z.object({
  id: z.string().uuid(),
  year: z.number(),
  qNumber: z.number(),
  section: z.string(),
  subTopic: z.string(),
  difficulty: z.number(),
  bodyMd: z.string(),
  choices: z.unknown(),
  isNumeric: z.boolean(),
  remainingToday: z.number().nullable(),
  totalPublished: z.number().nullable(),
  // ジゲンAI v2: 今日解いた数(source='daily')と1日目標数
  todaySolved: z.number().optional(),
  todayTarget: z.number().optional(),
});
export type PracticeNextResponse = z.infer<typeof PracticeNextResponse>;

// ============ /api/attempts (POST) ============
export const AttemptRequest = z.object({
  questionId: z.string().uuid(),
  userAnswer: z.unknown(),
  responseSeconds: z.number().int().min(0),
  confidence: z.number().int().min(1).max(3).optional(),
  dailyTaskId: z.string().uuid().optional(),
  // 進捗カウント分離用 — 'daily'(デフォルト) / 'mistakes' / 'other'
  source: z.enum(['daily', 'mistakes', 'other']).optional(),
});
export type AttemptRequest = z.infer<typeof AttemptRequest>;

// ハル → ナギ:
//   AttemptSubmitResponse は AttemptResponse のエイリアス。
//   採点後だけ correctAnswer / explanation を返す設計。
//   後方互換のため explanationMd キーも残しているが、新規実装は explanation を使うこと。
export const NextRecommendation = z.object({
  reason: z.enum(['review_same_topic', 'next_random']),
  subTopic: z.string().nullable(),
  href: z.string(),
});
export type NextRecommendation = z.infer<typeof NextRecommendation>;

export const AttemptResponse = z.object({
  id: z.string().uuid(),
  isCorrect: z.boolean(),
  isNearMiss: z.boolean(),
  correctAnswer: z.unknown(),
  explanation: z.string(),
  // 後方互換(旧クライアント向け)
  explanationMd: z.string(),
  masteryUpdated: z.object({
    subTopic: z.string(),
    masteryP: z.number(),
  }),
  nextRecommendation: NextRecommendation.nullable(),
});
export type AttemptResponse = z.infer<typeof AttemptResponse>;

// エイリアス: ナギは AttemptSubmitRequest / AttemptSubmitResponse でも import 可能
export const AttemptSubmitRequest = AttemptRequest;
export type AttemptSubmitRequest = AttemptRequest;
export const AttemptSubmitResponse = AttemptResponse;
export type AttemptSubmitResponse = AttemptResponse;

// ============ /api/mastery ============
export const MasteryResponse = z.object({
  items: z.array(
    z.object({
      subTopic: z.string(),
      masteryP: z.number(),
      attemptsCount: z.number(),
      correctCount: z.number(),
      nextReviewAt: z.string().nullable(),
    }),
  ),
});
export type MasteryResponse = z.infer<typeof MasteryResponse>;

// ============ /api/reports/weekly ============
export const WeeklyReportResponse = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  totalAttempts: z.number(),
  totalCorrect: z.number(),
  daysActive: z.number(),
  subTopicProgress: z.array(
    z.object({
      subTopic: z.string(),
      deltaMasteryP: z.number(),
    }),
  ),
});
export type WeeklyReportResponse = z.infer<typeof WeeklyReportResponse>;

// ============ /api/billing/checkout (POST) ============
export const CheckoutRequest = z.object({
  plan: z.enum(['monthly', 'yearly']),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const CheckoutResponse = z.object({
  url: z.string().url(),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponse>;

// ============ /api/notifications/subscribe (POST) ============
export const PushSubscribeRequest = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscribeRequest = z.infer<typeof PushSubscribeRequest>;

// ============ /api/notifications/preferences (PATCH) ============
export const NotificationPreferencesRequest = z.object({
  morningAt: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  enabled: z.boolean().optional(),
});
export type NotificationPreferencesRequest = z.infer<typeof NotificationPreferencesRequest>;

// ============ /api/streak/grace (POST) ============
export const StreakGraceResponse = z.object({
  usedAt: z.string(),
  recoveryTokensRemaining: z.number(),
});
export type StreakGraceResponse = z.infer<typeof StreakGraceResponse>;

// ============ 共通エラー ============
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
