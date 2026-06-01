import Link from 'next/link';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

// 模試: Phase 2以降で実装。当面は「準備中」表示でホーム「今日の問題」に誘導。
export default function MockExamComingSoonPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center text-jigen-ink">
      <TiranoSensei size="lg" glow label="ティラノ先生" />
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-jigen-gold">
          Coming Soon
        </p>
        <h1 className="text-xl font-bold text-jigen-ink">
          模試機能は準備中です
        </h1>
        <p className="text-sm leading-relaxed text-jigen-ink-soft">
          まずは「今日の問題」を毎日少しずつ。
          <br />
          積み重ねたデータをもとに、模試を最適化してお届けします。
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
