'use client';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// 軽量アコーディオン(@radix-ui/react-accordion 未導入のため独自実装)
// FAQ等のシンプル用途向け。複数同時開閉を許可、キーボード操作可能。

type AccordionContextValue = {
  openIds: Set<string>;
  toggle: (id: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  className,
  children,
  defaultOpenIds = [],
}: {
  className?: string;
  children: React.ReactNode;
  defaultOpenIds?: string[];
}) {
  const [openIds, setOpenIds] = React.useState<Set<string>>(() => new Set(defaultOpenIds));
  const toggle = React.useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return (
    <AccordionContext.Provider value={{ openIds, toggle }}>
      <div className={cn('divide-y rounded-lg border bg-card', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  id,
  question,
  children,
}: {
  id: string;
  question: React.ReactNode;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error('AccordionItem must be used within Accordion');
  const open = ctx.openIds.has(id);
  const panelId = `faq-panel-${id}`;
  const headerId = `faq-header-${id}`;
  return (
    <div>
      <h3 id={headerId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => ctx.toggle(id)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{question}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-5 pb-5 pt-0 text-base leading-relaxed text-foreground/90"
        >
          {children}
        </div>
      )}
    </div>
  );
}
