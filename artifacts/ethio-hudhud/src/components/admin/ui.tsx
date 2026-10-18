import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Btn } from '@/components/bits';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export const fieldCls = 'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, tone }: { title: string; onClose: () => void; children: ReactNode; tone?: 'danger' }) {
  const { t } = useApp();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-deep/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className={cn('max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border bg-card p-5 sm:rounded-3xl sm:p-6', tone === 'danger' ? 'border-destructive' : 'border-border')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <Btn variant="ghost" size="sm" onClick={onClose} aria-label={t('إغلاق', 'Close')} data-testid="button-modal-close"><X className="size-4" /></Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'ok' | 'err' | 'info'; children: ReactNode }) {
  const c = kind === 'ok' ? 'border-primary/50 bg-primary/10' : kind === 'err' ? 'border-destructive/60 bg-destructive/10' : 'border-gold/50 bg-gold/10';
  return <p role={kind === 'err' ? 'alert' : 'status'} className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', c)}>{children}</p>;
}
