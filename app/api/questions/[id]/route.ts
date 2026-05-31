/**
 * GET /api/questions/[id]
 * 個別問題取得。公開問題のみ。回答前なので answer / explanationMd は返さない。
 *
 * ナギ側: types/api.ts の QuestionResponse を import すること。
 */
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { questions } from '@/db/schema';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireUser();

    if (!UUID_RE.test(params.id)) {
      return NextResponse.json(
        { error: { code: 'validation_error', message: 'invalid id' } },
        { status: 400 },
      );
    }

    const [q] = await db
      .select({
        id: questions.id,
        year: questions.year,
        qNumber: questions.qNumber,
        section: questions.section,
        subTopic: questions.subTopic,
        difficulty: questions.difficulty,
        bodyMd: questions.bodyMd,
        choices: questions.choices,
        isNumeric: questions.isNumeric,
      })
      .from(questions)
      .where(and(eq(questions.id, params.id), eq(questions.published, true)))
      .limit(1);

    if (!q) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'question not found' } },
        { status: 404 },
      );
    }

    return NextResponse.json(q);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: { code: 'internal_error', message: (err as Error).message } },
      { status: 500 },
    );
  }
}
