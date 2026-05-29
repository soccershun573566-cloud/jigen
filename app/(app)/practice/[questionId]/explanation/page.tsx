import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { ExplanationActions } from '@/components/practice/ExplanationActions';
import { getExplanation } from '@/lib/mock/dashboard-data';

interface Props {
  params: { questionId: string };
}

// S07 解説画面
// 公式解説 + AIによる「あなた向け」補足 + 関連問題サジェスト2問。
// 「過去問」表記禁止 → 「試験対策問題」「関連問題」表現を徹底(ユウ§7.2)。
export default function ExplanationPage({ params }: Props) {
  const data = getExplanation(params.questionId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
      <div>
        <Link
          href={`/practice/${params.questionId}`}
          className="inline-flex h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          問題に戻る
        </Link>
      </div>

      {/* 公式解説 */}
      <section aria-label="解説" className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">解説</h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{data.official}</p>
      </section>

      {/* AI「あなた向け」補足 */}
      <section
        aria-label="あなた向けの補足"
        className="rounded-xl border bg-secondary/60 p-5"
      >
        <h2 className="text-sm font-semibold">あなた向けの補足</h2>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{data.personalized}</p>
      </section>

      {/* 関連問題サジェスト(過去問と書かない) */}
      <section aria-label="関連問題">
        <h2 className="text-sm font-semibold">関連する試験対策問題</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {data.related.map((r) => (
            <li key={r.id}>
              <Link
                href={`/practice/${r.id}`}
                className="flex min-h-[56px] items-center gap-3 rounded-lg border bg-background p-4 text-left text-sm hover:bg-secondary"
              >
                <BookOpen aria-hidden className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium leading-snug">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.subTopic}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="pt-2">
        <ExplanationActions questionId={params.questionId} />
      </div>
    </div>
  );
}
