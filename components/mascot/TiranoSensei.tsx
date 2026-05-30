import { cn } from '@/lib/utils';

/**
 * ティラノ先生 - ジゲンの公式マスコット(緑のティラノ恐竜 + 白いヘルメット = 建築現場感)。
 *
 * 画像受領前のプレースホルダ実装。
 * 画像が手元に届いたら下記 PLACEHOLDER ブロックを差し替えるだけで、
 * 呼び出し側(home/page.tsx ほか)は一切変更不要にしてある。
 *
 * props:
 *   size  - サイズプリセット (xs/sm/md/lg/xl)
 *   pose  - ポーズ識別子(将来 SVG/画像差分用)
 *   mood  - 表情識別子(笑顔/真剣/驚き)
 *   label - スクリーンリーダー用ラベル(指定なければ "ティラノ先生")
 */

export type TiranoPose = 'main' | 'cheer' | 'point' | 'study' | 'helmet' | 'face';
export type TiranoMood = 'smile' | 'serious' | 'surprise' | 'gentle';
export type TiranoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  pose?: TiranoPose;
  mood?: TiranoMood;
  size?: TiranoSize;
  /** ヘルメット階級(シルバー/ゴールド/プラチナ等)。表示用ラベル。 */
  helmetRank?: string;
  /** 円形フレーム(顔だけ表示などに使う) */
  rounded?: boolean;
  /** ゴールドのglow枠 */
  glow?: boolean;
  className?: string;
  label?: string;
};

const SIZE_MAP: Record<TiranoSize, string> = {
  xs: 'w-10 h-10 text-[9px]',
  sm: 'w-16 h-16 text-[10px]',
  md: 'w-24 h-24 text-xs',
  lg: 'w-32 h-32 text-sm',
  xl: 'w-44 h-44 text-base',
};

const POSE_EMOJI: Record<TiranoPose, string> = {
  main: 'T-Rex',
  cheer: 'T-Rex',
  point: 'T-Rex',
  study: 'T-Rex',
  helmet: 'Helmet',
  face: 'T-Rex',
};

export function TiranoSensei({
  pose = 'main',
  mood = 'smile',
  size = 'md',
  helmetRank,
  rounded = false,
  glow = false,
  className,
  label,
}: Props) {
  const sizeCls = SIZE_MAP[size];
  const a11yLabel = label ?? `ティラノ先生 (${pose}, ${mood})`;

  return (
    <div
      role="img"
      aria-label={a11yLabel}
      className={cn(
        'relative shrink-0 select-none',
        sizeCls,
        rounded ? 'rounded-full' : 'rounded-2xl',
        'bg-jigen-bg-panel-2 ring-1 ring-jigen-border-soft',
        glow && 'shadow-gold-glow ring-jigen-gold/40',
        'flex flex-col items-center justify-center overflow-hidden',
        className,
      )}
    >
      {/* 暫定アイコン: 画像生成完了したら ↓ をそのまま <Image src=... fill /> に置換 */}
      <div className="flex flex-col items-center justify-center gap-1">
        <span aria-hidden className="text-5xl leading-none drop-shadow-lg">
          🦖
        </span>
        <span aria-hidden className="text-[10px] font-semibold tracking-wider text-jigen-gold">
          TIRANO
        </span>
      </div>
      {helmetRank ? (
        <span
          aria-hidden
          className="absolute bottom-1 right-1 rounded bg-jigen-bg-panel-2/80 px-1.5 py-0.5 text-[10px] text-jigen-gold"
        >
          {helmetRank}
        </span>
      ) : null}
    </div>
  );
}
