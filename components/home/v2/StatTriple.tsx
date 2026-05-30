import { Award, Mountain, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatItem = {
  icon: 'award' | 'mountain' | 'flame';
  label: string;
  value: string;
  /** 値に付ける単位(例: "日") */
  unit?: string;
  /** 値カラー */
  emphasis?: 'gold' | 'ink';
};

type Props = {
  items: StatItem[];
  className?: string;
};

const ICON_MAP = {
  award: Award,
  mountain: Mountain,
  flame: Flame,
} as const;

/**
 * 3カラム統計表示(現在判定 / 現在地 / 継続日数)。
 * 各セルに月桂樹/山/炎のアイコン + ゴールド枠。
 */
export function StatTriple({ items, className }: Props) {
  return (
    <section
      aria-label="現在の状況"
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-jigen-border-soft bg-jigen-bg-panel p-4 shadow-panel"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-jigen-gold/30 bg-jigen-bg-panel-2 text-jigen-gold">
              <Icon aria-hidden className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-jigen-ink-mute">
                {item.label}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-2xl font-bold tabular-nums',
                  item.emphasis === 'gold'
                    ? 'text-jigen-gold-bright drop-shadow-[0_0_6px_rgba(245,196,65,0.35)]'
                    : 'text-jigen-ink',
                )}
              >
                {item.value}
                {item.unit ? (
                  <span className="ml-1 text-sm font-medium text-jigen-ink-soft">
                    {item.unit}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
