import { cn } from '@/lib/utils';

type Props = {
  /** 0-100 */
  value: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: 'gold' | 'warning';
  className?: string;
};

/**
 * SVG ベースの円形プログレス。ホーム v2 の AM/PM 達成率表示で使用。
 * a11y: role=img + aria-valuenow を付与。
 */
export function CircularProgress({
  value,
  label,
  size = 88,
  strokeWidth = 8,
  color = 'gold',
  className,
}: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (c * v) / 100;
  const stroke = color === 'warning' ? '#ef4444' : '#f5c441';

  return (
    <div
      role="img"
      aria-label={`${label ?? '進捗'} ${v}%`}
      aria-valuenow={v}
      className={cn('relative inline-flex flex-col items-center gap-1', className)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {/* 背景円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#2a3550"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 進捗円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(245, 196, 65, 0.45))',
            transition: 'stroke-dashoffset 600ms ease-out',
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-jigen-ink"
          style={{ fontSize: size * 0.22, fontWeight: 700 }}
        >
          {v}%
        </text>
      </svg>
      {label ? (
        <span className="text-xs font-medium uppercase tracking-wider text-jigen-ink-soft">
          {label}
        </span>
      ) : null}
    </div>
  );
}
