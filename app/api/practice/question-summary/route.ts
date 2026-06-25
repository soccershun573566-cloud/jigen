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
3. fill_in_question: 同じ知識を確認する穴埋め問題文を 1つ 作成。 空欄は 2〜3 個必須。 空欄は半角 [_1_], [_2_], [_3_] の形式で表記
   - 空欄にする対象は次の優先順位で選ぶ:
     (a) 数値+単位 (例: 「3.0 N/mm²」 「270 kg/m³」)
     (b) 専門用語・固有名詞 (例: 「コールドジョイント」「保有耐力接合」「セメントペースト」)
     (c) 重要キーワード (例: 「最小値」「短くする」「先行する」)
   - 数値だけに偏らず、 必ず最低1つは 用語・キーワードを含めること
   - 試験で問われやすい知識(覚えるべき要点)を空欄にする
4. fill_in_answers: 各空欄の正解と、 受験生が書きそうな別表記(aliases)
   - 数値: 単位込み・単位なし両方を aliases に
   - 用語: 漢字/かな表記の揺れ・略称・別名(例: 「鉄筋コンクリート」 → aliases:["RC", "鉄筋コンクリート造"])

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

/**
 * AI が動かないとき(OPENAI_API_KEY未設定・タイムアウト等) の機械的フォールバック。
 * 解説文から数値・専門用語を抽出して穴埋め化する。
 */

// 1級建築施工管理技士でよく出る専門用語の辞書(優先的に空欄化する)
const TERM_DICT: string[] = [
  // コンクリート
  'コンクリート', 'コールドジョイント', 'ワーカビリティー', 'スランプ', 'レイタンス',
  'ブリーディング', 'セメントペースト', 'モルタル', 'AE減水剤', '骨材', '細骨材率',
  '養生', '湿潤養生', '寒中コンクリート', '暑中コンクリート', '高強度コンクリート',
  '水セメント比', '単位セメント量', '単位水量', '塩化物イオン', '空気量',
  // 鉄筋・鉄骨
  'ガス圧接', '機械式継手', '重ね継手', 'かぶり厚さ', 'スターラップ', 'あばら筋',
  '高力ボルト', '保有耐力接合', '完全溶込み溶接', 'すみ肉溶接', '溶接金属',
  // 仮設・型枠
  'せき板', '支保工', '型枠', '建入れ直し', '建方', '足場', '乗入れ構台',
  // 仕上げ・防水
  '改質アスファルト', 'シーリング', 'タイル', '密着工法', '改良圧着', 'モザイクタイル',
  '塗膜防水', 'アスファルト防水', 'ルーフィング',
  // 法規・管理
  '主任技術者', '監理技術者', '施工体制台帳', 'クリティカルパス', 'フリーフロート',
  'トータルフロート', 'ネットワーク工程表', 'バーチャート',
];

function findTerms(text: string): Array<{ term: string; index: number }> {
  const hits: Array<{ term: string; index: number }> = [];
  for (const term of TERM_DICT) {
    const i = text.indexOf(term);
    if (i >= 0) hits.push({ term, index: i });
  }
  // 出現位置順
  hits.sort((a, b) => a.index - b.index);
  return hits;
}

function buildFallbackSummary(args: {
  subTopic: string;
  explanationMd: string;
}): Summary {
  const text = (args.explanationMd || '').replace(/\s+/g, ' ').trim();
  const sentences = text.split(/[。．.\n]/).map((s) => s.trim()).filter(Boolean);
  const firstSentence = sentences[0] ?? text;
  const shortExplanation = firstSentence.slice(0, 100) + (firstSentence.length > 100 ? '…' : '。');
  const lastSentence = sentences[sentences.length - 1] ?? text;
  const keyPoint = (`${args.subTopic} — ${lastSentence}`).slice(0, 80);

  // 穴埋め対象を「数値+単位 / 専門用語」 の混合で最大3つ抽出
  const NUM_RE = /(\d+(?:\.\d+)?)([a-zA-Z%℃°]?[a-zA-Z²³/]*)/g;
  const baseSrc = firstSentence;

  type Mask = { start: number; end: number; answer: string; aliases: string[]; kind: 'num' | 'term' };
  const candidates: Mask[] = [];

  // 1) 数値+単位 を候補に追加
  let nm: RegExpExecArray | null;
  while ((nm = NUM_RE.exec(baseSrc))) {
    const num = nm[1] ?? '';
    const unit = nm[2] ?? '';
    const answer = num + unit;
    const aliases = unit ? [num] : [];
    candidates.push({ start: nm.index, end: nm.index + nm[0].length, answer, aliases, kind: 'num' });
  }

  // 2) 専門用語 を候補に追加
  for (const { term, index } of findTerms(baseSrc)) {
    candidates.push({ start: index, end: index + term.length, answer: term, aliases: [], kind: 'term' });
  }

  // 出現順にソート・先頭3つまで・重複(被り) を除外
  candidates.sort((a, b) => a.start - b.start);
  const picked: Mask[] = [];
  for (const c of candidates) {
    if (picked.some((p) => !(c.end <= p.start || c.start >= p.end))) continue; // 重複範囲
    picked.push(c);
    if (picked.length >= 3) break;
  }

  // 穴埋め文を組み立て
  let masked = '';
  const masks: Array<{ idx: number; answer: string; aliases: string[] }> = [];
  let last = 0;
  picked.forEach((p, i) => {
    masked += baseSrc.slice(last, p.start) + `[_${i + 1}_]`;
    last = p.end;
    masks.push({ idx: i + 1, answer: p.answer, aliases: p.aliases });
  });
  masked += baseSrc.slice(last);

  // 1個も抽出できなかった場合は最後の砦: 最初の名詞っぽい単語を穴埋め
  if (masks.length === 0) {
    const words = baseSrc.split(/[、,\s。．・]/).filter((w) => w.length >= 2);
    if (words.length > 0) {
      const w = words[0]!;
      masked = baseSrc.replace(w, '[_1_]');
      masks.push({ idx: 1, answer: w, aliases: [] });
    } else {
      masked = baseSrc;
      masks.push({ idx: 1, answer: text.slice(0, 10), aliases: [] });
    }
  }

  return {
    shortExplanation,
    keyPoint,
    fillInQuestion: masked.slice(0, 200),
    fillInAnswers: masks,
  };
}

export async function POST(req: Request) {
  try {
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

    // AI 生成を試みる。 失敗時は機械的フォールバックで継続(UIが落ちないように)
    let summary: Summary;
    let usedFallback = false;

    if (process.env.OPENAI_API_KEY) {
      try {
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

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI response did not contain JSON');

        const payload = JSON.parse(jsonMatch[0]) as {
          short_explanation?: string;
          key_point?: string;
          fill_in_question?: string;
          fill_in_answers?: Array<{ idx?: number; answer?: string; aliases?: string[] }>;
        };

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
        summary = { shortExplanation, keyPoint, fillInQuestion, fillInAnswers };
      } catch (e) {
        console.error('[question-summary] AI failed, using fallback:', (e as Error).message);
        summary = buildFallbackSummary({ subTopic: q.subTopic, explanationMd: q.explanationMd });
        usedFallback = true;
      }
    } else {
      summary = buildFallbackSummary({ subTopic: q.subTopic, explanationMd: q.explanationMd });
      usedFallback = true;
    }

    const { shortExplanation, keyPoint, fillInQuestion, fillInAnswers } = summary;

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

    return NextResponse.json({ ...summary, cached: false, usedFallback });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
