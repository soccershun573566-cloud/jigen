import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldHeatmap } from '@/components/mastery/FieldHeatmap';
import { getMasterySummary } from '@/lib/mock/dashboard-data';

// S09 弱点ダッシュボード
// ユウ§3 / §4.4: 「弱点」と書かない。「これから伸びる単元」/「伸びしろ」を使う。
// 構成: 分野別ヒートマップ / TOP3 / AIコメント / 重点単元 CTA
export default function MasteryPage() {
  const m = getMasterySummary();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">伸びしろ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          分野別の現在地と、次に厚めに組む単元。
        </p>
      </header>

      <section aria-label="分野別の習熟度">
        <h2 className="mb-3 text-sm font-semibold">分野別の現在地</h2>
        <FieldHeatmap fields={m.fields} />
      </section>

      <section aria-label="これから伸びる単元">
        <h2 className="mb-3 text-sm font-semibold">これから伸びる単元</h2>
        <ol className="flex flex-col gap-2">
          {m.growingTop3.map((u, i) => (
            <li
              key={u.subTopic}
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-secondary-foreground"
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{u.subTopic}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {u.field} / 現在 {u.mastery} / 100
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                +{u.upsidePt}pt
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="次の重点"
        className="rounded-xl border bg-secondary/60 p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          次の重点
        </p>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">
          {m.nextFocusNote}
        </p>
      </section>

      <div className="pt-2">
        <Button asChild size="lg" className="h-14 w-full text-base">
          <Link href={`/practice/${m.focusStartQuestionId}`}>
            重点単元の演習へ
            <ArrowRight aria-hidden className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
