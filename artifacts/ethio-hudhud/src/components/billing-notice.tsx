import { Link } from 'wouter';
import { BellRing, Clock, UserPlus } from 'lucide-react';
import { getGetBillingStatusQueryKey, useGetBillingStatus } from '@workspace/api-client-react';
import { useApp } from '@/lib/app';
import { RenewalPushSettings } from './renewal-push';

export function useBilling() {
  return useGetBillingStatus({ query: { queryKey: getGetBillingStatusQueryKey(), refetchInterval: 60_000, refetchOnWindowFocus: true } });
}

export function BillingNotice() {
  const { t, lang } = useApp();
  const { data: b } = useBilling();
  if (!b) return null; // loading/error never blocks the app
  const comp = b.plan === 'complimentary';
  const fmt = (s: string) => new Date(s).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' });
  const row = 'flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm';
  const link = 'press rounded-xl bg-primary px-3 py-1.5 font-semibold text-primary-foreground';
  const rem = b.reminder;
  const remText = rem && (rem.kind === 'complimentary_expiring'
    ? t('منحتك المجانية تنتهي قريبًا', 'Your complimentary access ends soon')
    : rem.kind === 'renewal_due' ? t('موعد التجديد يقترب', 'Renewal is coming up') : t('وصول الدورة ينتهي قريبًا', 'Your course access ends soon'));
  return (
    <div className="mb-4 space-y-2" data-testid="billing-notice">
      {comp ? (
        b.accessExpiresAt && <p className={`${row} border-gold/50 bg-gold/10`} data-testid="text-complimentary-expiry"><Clock className="size-4 shrink-0" />{t('منحة مجانية حتى ', 'Complimentary access until ')}{fmt(b.accessExpiresAt)}</p>
      ) : b.trial.state === 'active' ? (
        <p className={`${row} border-border bg-card`} data-testid="text-trial-remaining">
          <Clock className="size-4 shrink-0" />
          <span className="flex-1">{t(`تجربة 48 ساعة: ${b.trial.daysRemaining} يوم متبقٍ. كل الدروس مفتوحة.`, `48-hour trial: ${b.trial.daysRemaining} day(s) left. All lessons are open.`)}</span>
        </p>
      ) : (
        <div className={`${row} border-primary/40 bg-primary/10`} data-testid="banner-trial-expired">
          <span className="min-w-0 flex-1 font-medium">{b.isGuest
            ? t('انتهت التجربة. أنشئ حسابًا لبدء تقدم مستقل واطّلع على الخطط. لا ينتقل تقدم الضيف تلقائيًا. التعلم ما زال مفتوحًا.', 'Your trial has ended. Create an account for separate account progress and see the plans. Guest progress does not transfer automatically. Learning stays open.')
            : t('انتهت التجربة. اطّلع على الخطط. التعلم ما زال مفتوحًا.', 'Your trial has ended. See the plans. Learning stays open.')}</span>
          {b.isGuest && <Link href="/sign-up" className={link} data-testid="link-trial-signup"><UserPlus className="me-1 inline size-4" />{t('إنشاء حساب', 'Create account')}</Link>}
          <Link href="/premium" className={b.isGuest ? 'press font-semibold text-primary underline' : link} data-testid="link-trial-plans">{t('عرض الخطط', 'View plans')}</Link>
        </div>
      )}
      {rem && (
        <p className={`${row} border-gold/50 bg-gold/10`} data-testid="text-billing-reminder">
          <BellRing className="size-4 shrink-0" />{remText} · {fmt(rem.expiresAt)} · {t(`${rem.daysRemaining} يوم`, `${rem.daysRemaining} day(s)`)}
          <span className="text-xs text-muted-foreground">{t('تنبيه داخل التطبيق فقط', 'In-app alert only')}</span>
        </p>
      )}
      <RenewalPushSettings />
    </div>
  );
}
