import { Check } from 'lucide-react';
import { Card, ErrorState, LinkBtn, Skeleton } from '@/components/bits';
import { useBilling } from '@/components/billing-notice';
import { useApp } from '@/lib/app';

export function safePolarUrl(raw: string | null | undefined, environment: 'sandbox' | 'live' = 'sandbox'): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = environment === 'live' ? 'polar.sh' : 'sandbox.polar.sh';
    const ok = u.protocol === 'https:' && !u.username && !u.password && !u.port && u.hostname === host;
    return ok ? u.toString() : null;
  } catch { return null; }
}

type PlanId = 'trial' | 'monthly' | 'six_month';

export function CoursePlans({ onChoose, selected, busy, paidOnly = false }: { onChoose?: (plan: PlanId) => void; selected?: string | null; busy?: boolean; paidOnly?: boolean }) {
  const { t } = useApp();
  const q = useBilling();
  const b = q.data;
  const monthly = b?.offers.find((o) => o.id === 'monthly');
  const six = b?.offers.find((o) => o.id === 'six_month');
  const current = onChoose ? selected : selected ?? b?.selectedPlan;
  const expired = b?.enforcementEnabled && b.trial.state === 'expired';
  const hideTrial = paidOnly || expired;

  const action = (id: PlanId, label: string) => {
    const isSel = current === id;
    const text = isSel ? t('مختارة', 'Selected') : label;
    if (onChoose) {
      return (
        <label className={`mt-auto flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm font-semibold ${isSel ? 'border-primary bg-secondary' : 'border-input'} ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <input type="radio" name="course-plan" value={id} checked={isSel} disabled={busy} onChange={() => onChoose(id)} className="size-5 shrink-0 accent-[hsl(var(--primary))]" aria-label={label} data-testid={`button-choose-${id}`} />
          {text}
        </label>
      );
    }
    return <LinkBtn href={`/choose-plan?plan=${id}`} variant={isSel ? 'primary' : 'outline'} className="mt-4 w-full" testId={`button-choose-${id}`}>{text}</LinkBtn>;
  };
  const cls = (id: string, extra = '') => `flex flex-col ${extra} ${current === id ? 'border-primary ring-2 ring-primary/40' : ''} ${busy ? 'opacity-70' : ''}`;

  return (
    <section id="course-plans" data-testid="section-course-plans" aria-busy={busy || q.isLoading}>
      <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{hideTrial ? t('اختر طريقة الدفع لمتابعة التعلّم', 'Choose how to pay to continue learning') : t('اختر خطتك للتعلّم', 'Choose your learning plan')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('نفس البرنامج في الخطتين المدفوعتين. اختر الدفع لشهر أو لستة أشهر مرة واحدة.', 'Both paid options include the same programme. Pay for one month or six months at once.')}</p>
      <p className="mt-2 rounded-2xl bg-secondary p-3 text-sm" data-testid="text-plans-note">
        {b?.liveCheckoutEnabled
          ? b.enforcementEnabled
            ? t('تجربتك المجانية 48 ساعة. بعدها يلزم تأكيد الدفع لمتابعة الدروس. لا تجديد تلقائي، ولا رسوم بمجرد اختيار خطة.', 'Your free trial lasts 48 hours. After that, confirmed payment is required to continue lessons. No automatic renewal or charge just for choosing a plan.')
            : t('التعلّم مفتوح حاليًا. لا تُحصّل رسوم إلا عند إتمام الدفع عبر Polar، ولا تجديد تلقائي.', 'Learning is currently open. You are charged only when you complete Polar checkout. No automatic renewal.')
          : b?.sandboxCheckoutEnabled
          ? t('يمكنك اختبار الدفع عبر Polar التجريبي دون أموال حقيقية. لا يفعّل الاختبار اشتراكًا حقيقيًا ولا يغيّر وصولك للدروس.', 'Polar sandbox checkout is available for testing without real money. A test does not activate a real subscription or change lesson access.')
          : !b
            ? t('جارٍ التحقق من الخطط المتاحة…', 'Checking available plans…')
            : t('الدفع غير متاح حاليًا. اختيار خطة لا يُحصّل رسومًا ولا يمنح وصولًا مدفوعًا.', 'Payment is currently unavailable. Selecting a plan does not charge you or grant paid access.')}
      </p>
      {q.isLoading && <div className="mt-4 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>}
      {(q.isError || (b && (!monthly || !six))) && <div className="mt-4">{onChoose ? <p role="alert" className="text-sm text-destructive">{t('تعذّر عرض الخطط المتاحة. أعد تحميلها أدناه.', 'Could not display available plans. Reload them below.')}</p> : <ErrorState what={t('الخطط', 'plans')} onRetry={() => q.refetch()} />}</div>}
      {b && monthly && six && (
        <div role={onChoose ? 'radiogroup' : undefined} aria-label={onChoose ? t('خطة التعلّم', 'Learning plan') : undefined} className={`mt-4 grid gap-4 ${hideTrial ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {!hideTrial && <Card data-testid="card-plan-trial" className={cls('trial')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('تجربة مجانية', 'Free trial')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">{t('يومان', '48 hours')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('تجربة مجانية لمدة يومين (48 ساعة). اختيارها لا يعيد تشغيل ساعة التجربة.', 'A free two-day (48-hour) trial. Choosing it does not reset the trial clock.')}</p>
            <p className="mt-2 text-sm" data-testid="text-plan-trial-state">{b.trial.state === 'expired'
              ? t('انتهت تجربتك، لكن التعلّم ما زال مفتوحًا خلال المرحلة التجريبية.', 'Your trial has ended, but learning remains open during the pilot.')
              : t(`متبقٍ ${b.trial.daysRemaining} يوم من تجربتك الحالية.`, `${b.trial.daysRemaining} day(s) remain in your current trial.`)}</p>
            {action('trial', t('ابدأ التجربة', 'Choose trial'))}
          </Card>}
          <Card data-testid="card-plan-monthly" className={cls('monthly')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('شهري', 'Monthly')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold" data-testid="text-price-monthly">${monthly.priceUsd}<span className="text-base font-medium text-muted-foreground"> {t('/ شهر واحد', '/ one month')}</span></p>
            <p className="mb-4 mt-2 text-sm text-muted-foreground" data-testid="text-total-monthly">{t(`شهر واحد لكل دفعة يدوية، حتى 6 دفعات ($${monthly.sixMonthTotalUsd}). لا تجديد تلقائي.`, `One month per manual payment, up to 6 payments ($${monthly.sixMonthTotalUsd}). No auto-renewal.`)}</p>
            {current === 'monthly' && b.liveCheckoutEnabled !== true && !b.sandboxCheckoutEnabled && <p className="mt-2 text-xs text-muted-foreground" data-testid="text-plan-monthly-cap">{t('شراء الشهري غير متاح بسبب الإعداد الحالي. لا رسوم.', 'Monthly purchase is unavailable under the current configuration. Nothing is charged.')}</p>}
            {action('monthly', t('اختر الشهري', 'Choose monthly'))}
          </Card>
          <Card data-testid="card-plan-six_month" className={cls('six_month', 'border-primary')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('ستة أشهر دفعة واحدة', 'Six months, once')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold" data-testid="text-price-six_month">${six.priceUsd}<span className="text-base font-medium text-muted-foreground"> {t('مرة واحدة', 'one time')}</span></p>
            <p className="mt-2 text-sm text-muted-foreground" data-testid="text-total-six_month">{t(`وصول ${six.durationMonths} أشهر.`, `${six.durationMonths} months of access.`)}</p>
            {six.savingsUsd > 0 && <p className="mb-4 mt-2 flex items-center gap-2 text-sm font-semibold" data-testid="text-savings"><Check className="size-4 text-primary" />{t(`توفير $${six.savingsUsd} (${six.savingsPercent}%)`, `Save $${six.savingsUsd} (${six.savingsPercent}%)`)}</p>}
            {action('six_month', t('اختر ستة أشهر', 'Choose six months'))}
          </Card>
        </div>
      )}
    </section>
  );
}
