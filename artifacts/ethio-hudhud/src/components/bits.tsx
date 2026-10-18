import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, FlaskConical, Headphones, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app';

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function btnClass(v: Variant = 'primary', s: Size = 'md', extra = '') {
  const vv: Record<Variant, string> = {
    primary: 'bg-primary text-primary-foreground shadow-[0_6px_0_-2px_hsl(var(--deep))] dark:shadow-[0_6px_0_-2px_hsl(var(--deep))]',
    gold: 'bg-gold text-gold-foreground shadow-[0_6px_0_-2px_hsl(39_50%_40%)]',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    outline: 'border border-input bg-card text-foreground hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground',
  };
  const ss: Record<Size, string> = {
    sm: 'h-9 px-3.5 text-sm',
    md: 'h-11 px-5 text-[15px]',
    lg: 'h-14 px-8 text-lg',
  };
  return cn(
    'press inline-flex items-center justify-center gap-2 rounded-2xl font-semibold disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
    vv[v], ss[s], extra,
  );
}

export function Btn({
  variant, size, className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" {...p} className={btnClass(variant, size, className)} />;
}

export function LinkBtn({
  href, variant, size, className, children, testId,
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; testId?: string }) {
  return (
    <Link href={href} data-testid={testId} className={btnClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cn('rounded-3xl border border-border bg-card p-5 sm:p-6', className)}>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skel', className)} aria-hidden />;
}

export function Am({ children, className }: { children: ReactNode; className?: string }) {
  return <span lang="am" dir="ltr" className={cn('am', className)}>{children}</span>;
}

export function ErrorState({ onRetry, what }: { onRetry?: () => void; what?: string }) {
  const { t } = useApp();
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center" data-testid="state-error">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="font-semibold">{t('تعذّر تحميل ', 'Could not load ') + (what ?? t('البيانات', 'data'))}</p>
      <p className="text-sm text-muted-foreground">{t('تحقق من الاتصال ثم حاول مرة أخرى.', 'Check your connection and try again.')}</p>
      {onRetry && (
        <Btn variant="outline" onClick={onRetry} data-testid="button-retry">
          <RotateCw className="size-4" /> {t('إعادة المحاولة', 'Retry')}
        </Btn>
      )}
    </Card>
  );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-input px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">{icon}</div>
      <p className="font-display text-lg font-bold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function PilotNote({ kind = 'content', className }: { kind?: 'content' | 'audio'; className?: string }) {
  const { t } = useApp();
  const Icon = kind === 'audio' ? Headphones : FlaskConical;
  return (
    <div
      className={cn('flex items-start gap-3 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm', className)}
      data-testid={`note-${kind}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-[hsl(39_70%_38%)] dark:text-gold" />
      <p className="leading-relaxed">
        {kind === 'audio'
          ? t('الصوت بانتظار تسجيلات مراجَعة من متحدثين مؤهلين. التدريب النصي يعمل بالكامل الآن.', 'Audio is waiting for reviewed recordings from qualified speakers. Text practice works fully today.')
          : t('هذا المحتوى تجريبي (pilot) وينتظر مراجعة مؤهلة قبل اعتماده. قد تحتوي الدروس على أخطاء.', 'This is pilot material awaiting qualified review. Lessons may contain mistakes.')}
      </p>
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-widest text-primary uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={Math.round(value)}>
      <div className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-700 rtl:origin-right" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
