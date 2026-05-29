import Link from 'next/link';
import fs from 'node:fs/promises';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// 法務ページ共通ラッパー
// public/legal/{slug}.md を読み込んで prose レンダリング。
// /legal/tokushoho, /legal/privacy, /legal/terms, /legal/cookie から共通利用。

type LegalPageProps = {
  title: string;
  slug: string; // 例: 'terms_of_service'
  fallbackNote?: string;
};

async function loadMarkdown(slug: string, fallback: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'legal', `${slug}.md`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

export async function LegalPage({ title, slug, fallbackNote }: LegalPageProps) {
  const fallback = `# ${title}\n\n${fallbackNote ?? '(準備中)'}`;
  const md = await loadMarkdown(slug, fallback);

  return (
    <main id="main" className="min-h-screen bg-background">
      <article className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav aria-label="戻る" className="mb-8 text-sm">
          <Link
            href="/lp"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ← トップへ戻る
          </Link>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>

        {/*
          @tailwindcss/typography は未導入のため、`prose` の代わりに
          任意セレクタで本文要素を整形する(依存追加なし方針)。
          TODO(ナギ): typography プラグイン導入時は単純な `prose` 化に置換可。
        */}
        <div
          className={[
            'mt-8 max-w-none text-base leading-relaxed text-foreground/90',
            '[&_h1]:mt-12 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground',
            '[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground',
            '[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground',
            '[&_p]:mt-4',
            '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1',
            '[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_a]:underline [&_a]:underline-offset-4 [&_a]:text-primary hover:[&_a]:text-foreground',
            '[&_strong]:font-semibold [&_strong]:text-foreground',
            '[&_hr]:my-10 [&_hr]:border-border',
            '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm',
            '[&_blockquote]:mt-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
            '[&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
            '[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
            '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
          ].join(' ')}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </div>
      </article>
      <MarketingFooter />
    </main>
  );
}
