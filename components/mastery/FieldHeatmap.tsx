import { cn } from '@/lib/utils';
import type { MasteryField } from '@/lib/mock/dashboard-data';

// ユウ§3 S09: 分野別ヒートマップ
// 「赤=危険」のように警告色で塗らない(§4.1 と同じ理由)。
// 濃淡で習熟度を示す。低い=色が薄く、高い=濃い。
function band(mastery: number): string {
  if (mastery >= 80) return 'bg-foreground text-background';
  if (mastery >= 65) return 'bg-foreground/75 text-background';
  if (mastery >= 50) return 'bg-foreground/50 text-background';
  if (mastery >= 35) return 'bg-foreground/25 text-foreground';
  return 'bg-muted text-foreground';
}

export function FieldHeatmap({ fields }: { fields: MasteryField[] }) {
  return (
    <ul aria-label="分野別の習熟度" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fields.map((f) => (
        <li
          key={f.name}
          className={cn(
            'flex flex-col gap-1 rounded-lg border p-3 transition-colors',
            band(f.mastery),
          )}
        >
          <span className="text-sm font-medium leading-tight">{f.name}</span>
          <span className="text-xs tabular-nums opacity-90">
            習熟 {f.mastery} / 100
          </span>
          <span className="text-[11px] opacity-75">
            7日 {f.recentDeltaPt >= 0 ? '+' : ''}
            {f.recentDeltaPt}pt
          </span>
        </li>
      ))}
    </ul>
  );
}
