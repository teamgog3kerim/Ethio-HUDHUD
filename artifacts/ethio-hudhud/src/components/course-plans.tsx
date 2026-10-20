import { Check } from 'lucide-react';
import { Btn, Card, ErrorState, LinkBtn, Skeleton } from '@/components/bits';
import { useBilling } from '@/components/billing-notice';
import { useApp } from '@/lib/app';

type PlanId = 'trial' | 'monthly' | 'six_month';

export function CoursePlans({ onChoose, selected, busy }: { onChoose?: (plan: PlanId) => void; selected?: string | null; busy?: boolean }) {
  const { t } = useApp();
  const q = useBilling();
  const b = q.data;
  const monthly = b?.offers.find((o) => o.id === 'monthly');
  const six = b?.offers.find((o) => o.id === 'six_month');
  const current = selected ?? b?.selectedPlan;

  const action = (id: PlanId, label: string) => {
    const isSel = current === id;
    const text = isSel ? t('مختارة', 'Selected') : label;
    if (onChoose) {
      return (
        <Btn className="mt-4 w-full" variant={isSel ? 'primary' : 'outline'} disabled={busy} aria-pressed={isSel} onClick={() => onChoose(id)} data-testid={`button-choose-${id}`}>
          {isSel && <Check className="size-4" />}{text}
        </Btn>
      );
    }
    return <LinkBtn href={`/choose-plan?plan=${id}`} variant={isSel ? 'primary' : 'outline'} className="mt-4 w-full" testId={`button-choose-${id}`}>{text}</LinkBtn>;
  };
  const cls = (id: string, extra = '') => `flex flex-col ${extra} ${current === id ? 'border-primary ring-2 ring-primary/40' : ''} ${busy ? 'opacity-70' : ''}`;

  return (
    <section id="course-plans" data-testid="section-course-plans" aria-busy={busy || q.isLoading}>
      <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{t('اختر خطتك ثم انتقل إلى الدروس', 'Choose a plan, then proceed to lessons')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('برنامج الأمهرية لستة أشهر لمتحدثي العربية. الاختيار تفضيل فقط.', 'The six-month Amharic programme for Arabic speakers. Your choice is a preference only.')}</p>
      <p className="mt-2 rounded-2xl bg-secondary p-3 text-sm" data-testid="text-plans-note">
        {t('الدفع عبر Polar مؤجّل: اختيار خطة مدفوعة تفضيل فقط، ولا رسوم ولا استحقاق مدفوع الآن. التعلّم يبقى مفتوحًا خلال المرحلة التجريبية.', 'Polar payments are deferred: choosing a paid plan is a preference only, with no charges and no paid entitlement yet. Pilot learning stays open.')}
      </p>
      {q.isLoading && <div className="mt-4 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>}
      {(q.isError || (b && (!monthly || !six))) && <div className="mt-4"><ErrorState what={t('الخطط', 'plans')} onRetry={() => q.refetch()} /></div>}
      {b && monthly && six && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card data-testid="card-plan-trial" className={cls('trial')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('تجربة مجانية', 'Free trial')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">{t('يومان', '48 hours')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('تجربة مجانية لمدة يومين (48 ساعة). اختيارها لا يعيد تشغيل ساعة التجربة.', 'A free two-day (48-hour) trial. Choosing it does not reset the trial clock.')}</p>
            <p className="mt-2 text-sm" data-testid="text-plan-trial-state">{b.trial.state === 'expired'
              ? t('انتهت تجربتك، لكن التعلّم ما زال مفتوحًا خلال المرحلة التجريبية.', 'Your trial has ended, but learning remains open during the pilot.')
              : t(`متبقٍ ${b.trial.daysRemaining} يوم من تجربتك الحالية.`, `${b.trial.daysRemaining} day(s) remain in your current trial.`)}</p>
            {action('trial', t('ابدأ التجربة', 'Choose trial'))}
          </Card>
          <Card data-testid="card-plan-monthly" className={cls('monthly')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('شهري', 'Monthly')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">${monthly.priceUsd}<span className="text-base font-medium text-muted-foreground"> {t('/ شهر', '/ month')}</span></p>
            <p className="mt-2 text-sm text-muted-foreground">{t(`$${monthly.sixMonthTotalUsd} لستة أشهر إذا استمر الشهري.`, `$${monthly.sixMonthTotalUsd} over six months if kept monthly.`)}</p>
            {action('monthly', t('اختر الشهري', 'Choose monthly'))}
          </Card>
          <Card data-testid="card-plan-six_month" className={cls('six_month', 'border-primary')}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('ستة أشهر دفعة واحدة', 'Six months, once')}</p>
            <p className="font-display mt-2 text-3xl font-extrabold">${six.priceUsd}<span className="text-base font-medium text-muted-foreground"> {t('مرة واحدة', 'one time')}</span></p>
            <p className="mt-2 text-sm text-muted-foreground">{t(`وصول ${six.durationMonths} أشهر.`, `${six.durationMonths} months of access.`)}</p>
            {six.savingsUsd > 0 && <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-primary" />{t(`توفير $${six.savingsUsd} (${six.savingsPercent}%)`, `Save $${six.savingsUsd} (${six.savingsPercent}%)`)}</p>}
            {action('six_month', t('اختر ستة أشهر', 'Choose six months'))}
          </Card>
        </div>
      )}
    </section>
  );
}
