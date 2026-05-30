import { AlertTriangle } from 'lucide-react';
import { TiranoSensei } from '@/components/mascot/TiranoSensei';

type Props = {
  comment: string;
  warning: string | null;
};

/**
 * ティラノ先生のAIコメントカード。
 * 励まし系メッセージ + 警告(任意)。
 */
export function AiCommentCard({ comment, warning }: Props) {
  return (
    <section
      aria-label="ティラノ先生からのコメント"
      className="rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5 shadow-panel"
    >
      <div className="flex items-start gap-4">
        <TiranoSensei size="md" pose="face" mood="gentle" rounded glow />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-jigen-gold">
            ティラノ先生
          </p>
          <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-jigen-ink">
            {comment}
          </p>
        </div>
      </div>

      {warning ? (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-lg border border-jigen-warning/40 bg-jigen-warning-soft/30 px-3 py-2"
        >
          <AlertTriangle
            aria-hidden
            className="h-4 w-4 shrink-0 text-jigen-warning"
          />
          <p className="text-sm font-semibold text-red-300">{warning}</p>
        </div>
      ) : null}
    </section>
  );
}
