// S06 演習画面(1問1画面)
// 2026-05-31 ナギ: モック → 実DB取得に刷新。
// サーバーコンポーネントで questions を直接読み、PracticeRunner にハイドレートする。
// 認証は requireUser() で担保。未公開 / 不在は 404。
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { questions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { PracticeRunner } from '@/components/practice/PracticeRunner';
import type { ChoiceQuestion } from '@/types/domain';

interface Props {
  params: { questionId: string };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QuestionPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (!UUID_RE.test(params.questionId)) {
    notFound();
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
      published: questions.published,
    })
    .from(questions)
    .where(eq(questions.id, params.questionId))
    .limit(1);

  if (!q || !q.published) {
    notFound();
  }

  // choices JSON を整形(現状の seed は { type:'choice', items:string[] })
  const choices = q.choices as ChoiceQuestion | { items?: string[] } | null;
  const items: string[] = Array.isArray((choices as ChoiceQuestion)?.items)
    ? (choices as ChoiceQuestion).items
    : [];

  return (
    <PracticeRunner
      question={{
        id: q.id,
        year: q.year,
        qNumber: q.qNumber,
        section: q.section,
        subTopic: q.subTopic,
        bodyMd: q.bodyMd,
        choices: items,
        isNumeric: q.isNumeric,
      }}
    />
  );
}
