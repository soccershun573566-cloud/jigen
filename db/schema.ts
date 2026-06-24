/**
 * Drizzle スキーマ定義(SoT)
 * 技術構築計画§2.1 の DDL を TypeScript に落とす。
 * ENUM / RLS / トリガ / インデックスは db/policies/ 下の SQL で別途管理。
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  real,
  date,
  time,
  timestamp,
  jsonb,
  smallint,
  bigserial,
  primaryKey,
  uniqueIndex,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============ ENUM ============
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google']);
export const questionSectionEnum = pgEnum('question_section', [
  '建築学一般',
  '施工管理法',
  '法規',
  'その他',
]);
export const copyrightStatusEnum = pgEnum('copyright_status', [
  'cleared',
  'pending',
  'restricted',
]);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'free',
]);
export const planTypeEnum = pgEnum('plan_type', ['monthly', 'yearly', 'free']);

// ============ users ============
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(), // references auth.users(id) on delete cascade
  email: text('email').notNull().unique(),
  authProvider: authProviderEnum('auth_provider').notNull().default('email'),
  displayName: text('display_name'),
  weekdayMinutes: integer('weekday_minutes').notNull().default(15),
  weekendMinutes: integer('weekend_minutes').notNull().default(60),
  targetExamDate: date('target_exam_date'),
  streakCount: integer('streak_count').notNull().default(0),
  streakGraceUsedAt: date('streak_grace_used_at'),
  recoveryTokens: integer('recovery_tokens').notNull().default(3),
  busyModeUntil: date('busy_mode_until'),
  timezone: text('timezone').notNull().default('Asia/Tokyo'),
  notificationMorningAt: time('notification_morning_at').default('07:00'),
  notificationEnabled: boolean('notification_enabled').notNull().default(true),
  // 今日の進捗カウンタのリセット時刻(null=リセット履歴なし、 値あり=以降のattemptsだけカウント)
  dailyResetAt: timestamp('daily_reset_at', { withTimezone: true }),
  // 25問ごとの区切り画面で「最後に見た節目」(0=未到達、1=25問達成、2=50問、…)
  lastMilestoneSeen: integer('last_milestone_seen').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============ questions ============
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  year: integer('year').notNull(),
  qNumber: integer('q_number').notNull(),
  section: questionSectionEnum('section').notNull(),
  subTopic: text('sub_topic').notNull(),
  difficulty: real('difficulty').notNull().default(0.5),
  bodyMd: text('body_md').notNull(),
  choices: jsonb('choices').notNull(),
  answer: jsonb('answer').notNull(),
  explanationMd: text('explanation_md').notNull(),
  isNumeric: boolean('is_numeric').notNull().default(false),
  numericTolerance: real('numeric_tolerance'),
  isApplied: boolean('is_applied').notNull().default(false),
  copyrightStatus: copyrightStatusEnum('copyright_status').notNull().default('pending'),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  yearQUnique: uniqueIndex('questions_year_q_unique').on(t.year, t.qNumber),
}));

// ============ daily_tasks ============
export const dailyTasks = pgTable('daily_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetDate: date('target_date').notNull(),
  questionIds: uuid('question_ids').array().notNull(),
  composition: jsonb('composition').notNull(),
  reasonMd: text('reason_md'),
  estimatedMinutes: integer('estimated_minutes').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userDateUnique: uniqueIndex('daily_tasks_user_date_unique').on(t.userId, t.targetDate),
}));

// ============ attempts ============
export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
  dailyTaskId: uuid('daily_task_id').references(() => dailyTasks.id, { onDelete: 'set null' }),
  userAnswer: jsonb('user_answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  isNearMiss: boolean('is_near_miss').notNull().default(false),
  responseSeconds: integer('response_seconds').notNull(),
  confidence: smallint('confidence'),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  // 'daily' | 'mistakes' | 'other' — ホーム進捗カウント分離用
  source: text('source').notNull().default('daily'),
});

// ============ mock_exams (模試) ============
export const mockExams = pgTable('mock_exams', {
  id: text('id').primaryKey(), // 'initial-50', 'pre-exam-2026-07' 等
  title: text('title').notNull(),
  description: text('description'),
  questionsCount: integer('questions_count').notNull(),
  availableFrom: timestamp('available_from', { withTimezone: true }),
  availableUntil: timestamp('available_until', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  oneTime: boolean('one_time').notNull().default(true), // 1度限り受験
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 模試と問題の関連 (順序付き)
export const mockExamQuestions = pgTable('mock_exam_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  mockExamId: text('mock_exam_id').notNull().references(() => mockExams.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
}, (t) => ({
  examOrderUnique: uniqueIndex('mock_exam_questions_unique').on(t.mockExamId, t.orderIndex),
}));

// ユーザーの模試受験記録
export const mockAttempts = pgTable('mock_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mockExamId: text('mock_exam_id').notNull().references(() => mockExams.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  currentQuestionIndex: integer('current_question_index').notNull().default(0),
  answers: jsonb('answers').notNull().default({}), // {q_number: answer_value}
  score: integer('score'), // 正答数
  sectionScores: jsonb('section_scores'), // {建築学一般: 12, 施工管理法: 25, 法規: 7}
}, (t) => ({
  userExamUnique: uniqueIndex('mock_attempts_user_exam_unique').on(t.userId, t.mockExamId),
}));

// ============ mastery_profiles ============
export const masteryProfiles = pgTable('mastery_profiles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subTopic: text('sub_topic').notNull(),
  masteryP: real('mastery_p').notNull().default(0.2),
  lastPracticedAt: timestamp('last_practiced_at', { withTimezone: true }),
  nextReviewAt: timestamp('next_review_at', { withTimezone: true }),
  attemptsCount: integer('attempts_count').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.subTopic] }),
}));

// ============ subscriptions ============
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  plan: planTypeEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('trialing'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============ ai_usage_logs ============
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  endpoint: text('endpoint').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  costJpy: numeric('cost_jpy', { precision: 10, scale: 2 }).notNull(),
  cached: boolean('cached').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============ ai_explanation_cache ============
export const aiExplanationCache = pgTable('ai_explanation_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  wrongAnswerKey: text('wrong_answer_key').notNull(),
  explanationMd: text('explanation_md').notNull(),
  hitCount: integer('hit_count').notNull().default(0),
  reviewerApproved: boolean('reviewer_approved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  questionWrongUnique: uniqueIndex('ai_cache_q_wrong_unique').on(t.questionId, t.wrongAnswerKey),
}));

// ============ push_subscriptions ============
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============ notification_logs ============
export const notificationLogs = pgTable('notification_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  kind: text('kind').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  openedAt: timestamp('opened_at', { withTimezone: true }),
});

// ============ webhook_events(冪等性用) ============
export const webhookEvents = pgTable('webhook_events', {
  id: text('id').primaryKey(), // Stripe event.id
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// 型エイリアス
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
export type DailyTask = typeof dailyTasks.$inferSelect;
export type NewDailyTask = typeof dailyTasks.$inferInsert;
export type MasteryProfile = typeof masteryProfiles.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
