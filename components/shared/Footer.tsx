import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t py-8 text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap gap-4">
          <Link href="/legal/tokushoho">特定商取引法表記</Link>
          <Link href="/legal/privacy">プライバシーポリシー</Link>
          <Link href="/legal/terms">利用規約</Link>
          <Link href="/legal/cookie">Cookieポリシー</Link>
        </nav>
        <p className="mt-4">(c) ティラノ資格学校</p>
      </div>
    </footer>
  );
}
