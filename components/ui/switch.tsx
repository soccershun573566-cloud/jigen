'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// 最小 Switch(radix 未使用 / ネイティブ checkbox に委譲)
// a11y: role=switch を付与し、aria-checked を内部 state と同期
type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  /** スクリーンリーダー用ラベル(visible label が無いとき) */
  'aria-label'?: string;
  /** 関連 label の id */
  'aria-labelledby'?: string;
  /** 補足説明の id */
  'aria-describedby'?: string;
  className?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      disabled,
      id,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-muted-foreground/40',
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    );
  },
);
Switch.displayName = 'Switch';
