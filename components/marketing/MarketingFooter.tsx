import Link from 'next/link';

// マーケティング用フッタ(ハナ§9)
// 法務リンク・SNSリンク・コピーライト

const COMPANY_LINKS = [
  { href: '/about', label: '会社情報' },
  { href: '/legal/tokushoho', label: '特定商取引法に基づく表記' },
  { href: '/legal/privacy', label: 'プライバシーポリシー' },
  { href: '/legal/terms', label: '利用規約' },
  { href: '/legal/cookie', label: 'Cookieポリシー' },
  { href: '/contact', label: 'お問い合わせ' },
];

const SNS_LINKS = [
  { href: 'https://x.com/jigen_sekokan', label: 'X(旧Twitter)' },
  { href: 'https://note.com/jigen_sekokan', label: 'note' },
];

export function MarketingFooter() {
  return (
    <footer className="border-t bg-background py-12 text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-2">
          <nav aria-label="会社情報">
            <h2 className="text-base font-semibold text-foreground">ジゲン</h2>
            <ul className="mt-4 space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="SNS">
            <h2 className="text-base font-semibold text-foreground">SNS</h2>
            <ul className="mt-4 space-y-2">
              {SNS_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © 2026 株式会社ティラノ資格学校
        </p>
      </div>
    </footer>
  );
}
