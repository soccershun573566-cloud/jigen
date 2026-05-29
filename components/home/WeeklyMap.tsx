import { cn } from '@/lib/utils';
import type { WeeklyDot } from '@/lib/mock/dashboard-data';

// ユウ§4.1: 空白マスを警告色で塗らない(グレー)。今日だけ薄い枠で印を付ける。
export function WeeklyMap({ dots }: { dots: WeeklyDot[] }) {
  return (
    <ul aria-label="今週の学習" className="flex items-end justify-between gap-1">
      {dots.map((d) => (
        <li key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'h-3 w-3 rounded-full',
              d.studied ? 'bg-foreground' : 'bg-muted',
              d.isToday && 'ring-2 ring-foreground/40 ring-offset-1',
            )}
          />
          <span className={cn('text-[11px]', d.isToday ? 'font-semibold' : 'text-muted-foreground')}>
            {d.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
