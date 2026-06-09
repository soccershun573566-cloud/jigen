import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { ContactForm } from '@/components/contact/ContactForm';

// お問い合わせ(2026-06-09 フォーム化完了)
// Resend経由でsupport@jigen-app.com に届く + replyToでユーザーメアド設定

export const dynamic = 'force-static';

const SUPPORT_EMAIL = 'support@jigen-app.com';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'ジゲンへのお問い合わせ窓口のご案内。',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
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
          お問い合わせ
        </h1>

        <p className="mt-6 text-base leading-relaxed text-foreground/90">
          サービスに関するご質問・不具合のご報告・ご要望は、 下記フォームからお送りください。
          通常2営業日以内に返信します(土日祝・年末年始を除く)。
        </p>

        {/* お問い合わせフォーム */}
        <div className="mt-8">
          <ContactForm />
        </div>

        {/* メール直接 (フォーム使えない方向け) */}
        <section aria-labelledby="email-section" className="mt-10 rounded-lg border border-border bg-muted/30 p-6">
          <h2 id="email-section" className="text-sm font-medium text-muted-foreground">
            フォームが使えない場合はメールで:
          </h2>
          <p className="mt-2 text-lg font-semibold text-foreground">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>

        <section aria-labelledby="note-section" className="mt-10">
          <h2 id="note-section" className="text-xl font-semibold text-foreground">
            お問い合わせ前にご確認ください
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-foreground/90">
            <li>
              料金・解約・トライアルについては{' '}
              <Link href="/legal/tokushoho" className="underline underline-offset-4 hover:text-foreground">
                特定商取引法に基づく表記
              </Link>
              {' '}に詳細を記載しています。
            </li>
            <li>
              個人情報の取扱いについては{' '}
              <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
                プライバシーポリシー
              </Link>
              {' '}をご参照ください。
            </li>
            <li>
              ご利用条件については{' '}
              <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
                利用規約
              </Link>
              {' '}をご参照ください。
            </li>
          </ul>
        </section>
      </article>
      <MarketingFooter />
    </main>
  );
}
