// OpenAI 月予算ガード + 使用量ログ
// 技術構築計画§5.2(3層ガードの2層目)
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiUsageLogs } from '@/db/schema';

export class BudgetExceededError extends Error {
  constructor() {
    super('OpenAI monthly budget exceeded');
    this.name = 'BudgetExceededError';
  }
}

export class RateLimitError extends Error {
  constructor(message = 'rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/** OpenAI USD 単価表(2026/05 現在)→ JPY 変換に使う */
const USD_TO_JPY = Number(process.env.USD_TO_JPY ?? 155);

const MODEL_PRICING_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-4o':        { input: 0.0025, output: 0.01 },
  'gpt-4o-mini':   { input: 0.00015, output: 0.0006 },
};

export function estimateCostJpy(args: {
  model: string;
  promptTokens: number;
  completionTokens: number;
}): number {
  const rate = MODEL_PRICING_PER_1K[args.model] ?? { input: 0.0025, output: 0.01 };
  const usd =
    (args.promptTokens / 1000) * rate.input +
    (args.completionTokens / 1000) * rate.output;
  const jpy = usd * USD_TO_JPY;
  return Math.round(jpy * 100) / 100;
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfDayJst(d: Date): Date {
  // JST = UTC+9。「今日 00:00 JST」を UTC タイムスタンプに換算。
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const jstMidnight = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), 0, 0, 0, 0),
  );
  return new Date(jstMidnight.getTime() - 9 * 60 * 60 * 1000);
}

/** 月予算を超えていたら BudgetExceededError を throw */
export async function checkBudgetOrThrow(): Promise<void> {
  const budget = Number(process.env.OPENAI_MONTHLY_BUDGET_JPY ?? 30000);
  const monthStart = startOfMonthUtc(new Date());
  const rows = await db
    .select({ sum: sql<string>`coalesce(sum(${aiUsageLogs.costJpy}), 0)` })
    .from(aiUsageLogs)
    .where(gte(aiUsageLogs.createdAt, monthStart));
  const used = Number(rows[0]?.sum ?? 0);
  if (used >= budget) {
    throw new BudgetExceededError();
  }
}

/** ユーザー単位レート制限。1日 limit リクエストを超えたら例外 */
export async function checkUserDailyRateLimit(
  userId: string,
  endpoint: string,
  limit = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 20),
): Promise<void> {
  const dayStart = startOfDayJst(new Date());
  const rows = await db
    .select({ count: sql<string>`count(*)` })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        eq(aiUsageLogs.endpoint, endpoint),
        gte(aiUsageLogs.createdAt, dayStart),
      ),
    );
  const count = Number(rows[0]?.count ?? 0);
  if (count >= limit) {
    throw new RateLimitError(`daily limit ${limit} reached`);
  }
}

/** API 呼び出し後に使用量を記録 */
export async function logUsage(args: {
  userId: string | null;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cached?: boolean;
}): Promise<void> {
  const cost = args.cached
    ? 0
    : estimateCostJpy({
        model: args.model,
        promptTokens: args.promptTokens,
        completionTokens: args.completionTokens,
      });
  try {
    await db.insert(aiUsageLogs).values({
      userId: args.userId,
      endpoint: args.endpoint,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costJpy: cost.toFixed(2),
      cached: !!args.cached,
    });
  } catch (err) {
    // ログ失敗は本処理を落とさない(Sentry に流す想定)
    // eslint-disable-next-line no-console
    console.error('[ai/budget] logUsage failed', err);
  }
}
