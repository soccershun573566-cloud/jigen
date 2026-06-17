import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

// ○×クイズ: 本アプリ(2026年10月)で実装予定
export default function QuizComingSoonPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center text-jigen-ink">
      <TiranoSensei size="lg" glow label="ティラノ先生" />
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
          Coming Soon
        </p>
        <h1 className="text-xl font-bold text-jigen-ink">
          ○×クイズは本アプリで搭載予定
        </h1>
        <p className="text-sm leading-relaxed text-jigen-ink">
          スキマ時間にサクッと判断力を鍛える、 ○×形式のミニクイズ機能です。
          <br />
          本アプリ(2026年10月) のリリースをお待ちください。
        </p>
        <p className="mt-3 text-xs text-jigen-ink-soft">
          試験直前verではご利用いただけません。
        </p>
      </div>
      <Link
        href="/home"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-gold-gradient px-6 text-sm font-bold text-jigen-bg-dark shadow-gold-glow transition-transform hover:scale-[1.02]"
      >
        今日の問題へ
      </Link>
    </main>
  );
}
