/**
 * POST /api/practice/question-summary
 *
 * 問題ID を受け取り、 以下を AI で生成 → DB キャッシュ → 返却:
 *   - shortExplanation: 解説の簡潔版(80字以内・1〜2文)
 *   - keyPoint:         学習ポイント(1文・60字以内)
 *   - fillInQuestion:   穴埋め問題文([_1_] [_2_] 形式の空欄)
 *   - fillInAnswers:    各空欄の正解と類似表現
 *
 * 既にキャッシュがあれば AI を呼ばずに即返却(コスト最小化)。
 */
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { openai } from '@/lib/ai/client';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { questions, questionSummaries } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({ questionId: z.string().uuid() });

type Summary = {
  shortExplanation: string;
  keyPoint: string;
  fillInQuestion: string;
  fillInAnswers: Array<{ idx: number; answer: string; aliases: string[] }>;
};

function buildPrompt(args: {
  section: string;
  subTopic: string;
  bodyMd: string;
  choices: string[];
  correctText: string;
  explanationMd: string;
}): string {
  return `あなたは1級建築施工管理技士の問題を解説する専門講師です。
以下の問題と解説をもとに、 学習効果が高い「要約・ポイント・穴埋め問題」 を生成してください。

【教科】 ${args.section} / ${args.subTopic}

【問題文】
${args.bodyMd}

【選択肢】
${args.choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}

【正答(正しい選択肢)】 ${args.correctText}

【公式解説】
${args.explanationMd}

【生成ルール】
1. short_explanation: 上記解説を 1〜2文・80字以内 に圧縮(平易な日本語)
2. key_point: 受験生が試験まで覚えておくべき要点を 1文・60字以内 で。 「〜は〜である」「〜の最小値は〜」 のような知識として記述
3. fill_in_question: 同じ知識を確認する穴埋め問題文を 1つ 作成。 空欄は 2〜3 個。 空欄は半角 [_1_], [_2_], [_3_] の形式で表記
4. fill_in_answers: 各空欄の正解と、 受験生が書きそうな別表記(aliases)。 数値の場合は単位込み・単位なし両方を aliases に含める

【出力形式】 必ず以下の JSON のみを返してください(コードブロックや前置きは禁止):
{
  "short_explanation": "...",
  "key_point": "...",
  "fill_in_question": "...",
  "fill_in_answers": [
    { "idx": 1, "answer": "...", "aliases": ["..."] },
    { "idx": 2, "answer": "...", "aliases": ["..."] }
  ]
}`;
}

function parseAnswerText(answer: unknown, choices: string[]): string {
  let v: unknown = answer;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch {} }
  if (typeof v === 'number') return `${v}. ${choices[v - 1] ?? ''}`;
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
    const inner = (v as { value: unknown }).value;
    if (typeof inner === 'number') return `${inner}. ${choices[inner - 1] ?? ''}`;
    if (Array.isArray(inner)) {
      return inner.map((n) => `${n}. ${choices[Number(n) - 1] ?? ''}`).join(' / ');
    }
  }
  if (Array.isArray(v)) {
    return v.map((n) => `${n}. ${choices[Number(n) - 1] ?? ''}`).join(' / ');
  }
  return String(v);
}

function parseJsonbField(raw: unknown): unknown {
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return raw; } }
  return raw;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: { code: 'config_error', message: 'OPENAI_API_KEY missing' } }, { status: 500 });
    }
    await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'validation_error', message: parsed.error.message } }, { status: 400 });
    }
    const { questionId } = parsed.data;

    // 既存キャッシュチェック
    const [existing] = await db
      .select()
      .from(questionSummaries)
      .where(eq(questionSummaries.questionId, questionId))
      .limit(1);
    if (existing) {
      return NextResponse.json({
        shortExplanation: existing.shortExplanation,
        keyPoint: existing.keyPoint,
        fillInQuestion: existing.fillInQuestion,
        fillInAnswers: existing.fillInAnswers,
        cached: true,
      });
    }

    // 問題ロード
    const [q] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!q) {
      return NextResponse.json({ error: { code: 'not_found', message: 'question not found' } }, { status: 404 });
    }
    const choicesArr = (parseJsonbField(q.choices) as string[]) ?? [];
    const correctText = parseAnswerText(q.answer, choicesArr);

    // AI生成
    const prompt = buildPrompt({
      section: q.section,
      subTopic: q.subTopic,
      bodyMd: q.bodyMd,
      choices: choicesArr,
      correctText,
      explanationMd: q.explanationMd,
    });

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    // JSON 抽出(LLMが前後にゴミを付けた場合に備える)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain JSON');
    }
    let payload: {
      short_explanation?: string;
      key_point?: string;
      fill_in_question?: string;
      fill_in_answers?: Array<{ idx?: number; answer?: string; aliases?: string[] }>;
    };
    try { payload = JSON.parse(jsonMatch[0]); }
    catch { throw new Error('AI response JSON parse failed'); }

    const shortExplanation = String(payload.short_explanation ?? '').trim();
    const keyPoint = String(payload.key_point ?? '').trim();
    const fillInQuestion = String(payload.fill_in_question ?? '').trim();
    const fillInAnswers = Array.isArray(payload.fill_in_answers)
      ? payload.fill_in_answers.map((x) => ({
          idx: typeof x.idx === 'number' ? x.idx : 0,
          answer: String(x.answer ?? '').trim(),
          aliases: Array.isArray(x.aliases) ? x.aliases.map((a) => String(a).trim()).filter(Boolean) : [],
        })).filter((x) => x.idx > 0 && x.answer.length > 0)
      : [];
    if (!shortExplanation || !keyPoint || !fillInQuestion || fillInAnswers.length === 0) {
      throw new Error('AI response missing required fields');
    }

    const summary: Summary = { shortExplanation, keyPoint, fillInQuestion, fillInAnswers };

    // DBキャッシュ
    await db
      .insert(questionSummaries)
      .values({
        questionId,
        shortExplanation,
        keyPoint,
        fillInQuestion,
        fillInAnswers,
      })
      .onConflictDoUpdate({
        target: questionSummaries.questionId,
        set: {
          shortExplanation,
          keyPoint,
          fillInQuestion,
          fillInAnswers,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ...summary, cached: false });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
