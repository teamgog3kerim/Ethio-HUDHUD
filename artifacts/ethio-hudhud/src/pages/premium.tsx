import { Link } from 'wouter';
import { Check, Lock } from 'lucide-react';
import { Btn, Card, ErrorState, PageHead, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useBilling } from '@/components/billing-notice';
import { useApp } from '@/lib/app';

export default function Premium() {
  const { t, lang } = useApp();
  const q = useBilling();
  const b = q.data;
  const comp = b?.plan === 'complimentary';
  const fmt = (s: string) => new Date(s).toLocaleString(lang === 'ar' ? 'ar' : 'en');
  const monthly = b?.offers.find((o) => o.id === 'monthly');
  const six = b?.offers.find((o) => o.id === 'six_month');
  return (
    <Shell>
      <PageHead eyebrow="Premium" title={t('الخطط المقترحة', 'Proposed plans')} sub={t('كل التعلّم مفتوح خلال المرحلة التجريبية. لا رسوم ولا دفع الآن.', 'All learning is open during the pilot. No charges and no payment today.')} />
      {q.isLoading && <Skeleton className="h-48" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {b && (
        <div className="space-y-5">
          <Card data-testid="card-billing">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('الخطة', 'Plan')}</dt><dd className="font-semibold" data-testid="text-plan">{b.plan}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('الدفع', 'Checkout')}</dt><dd className="font-semibold" data-testid="text-configured">{t('غير مفعّل (Polar قيد الانتظار)', 'Not enabled (Polar pending)')}</dd></div>
              {b.dailyAiLimit !== undefined && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('طلبات المعلّم / 24 ساعة', 'AI requests / 24 hours')}</dt><dd>{b.dailyAiLimit}</dd></div>}
              {comp && b.accessExpiresAt && <div className="flex flex-wrap justify-between gap-3"><dt className="text-muted-foreground">{t('انتهاء المنحة المجانية', 'Complimentary expiry')}</dt><dd data-testid="text-access-expiry">{fmt(b.accessExpiresAt)}</dd></div>}
            </dl>
            <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm" dir="auto" data-testid="text-billing-message">{lang === 'ar' ? b.message : comp ? 'You have a temporary administrator grant, not a paid subscription. No payment is collected.' : 'Polar checkout is not enabled. All learning stays open during the pilot, even after the two-day trial. No payment is collected.'}</p>
          </Card>

          {!comp && (
            <Card data-testid="card-trial">
              <h2 className="font-display text-lg font-bold">{t('التجربة المجانية 48 ساعة', 'Free 48-hour trial')}</h2>
              {b.trial.state === 'active' ? (
                <p className="mt-2 text-sm" data-testid="text-trial-countdown">{t(`متبقٍ ${b.trial.daysRemaining} يوم، وتنتهي ${fmt(b.trial.endsAt)}.`, `${b.trial.daysRemaining} day(s) left; ends ${fmt(b.trial.endsAt)}.`)}</p>
              ) : (
                <div className="mt-2 space-y-3 text-sm" data-testid="text-trial-expired">
                  <p>{t(`انتهت التجربة في ${fmt(b.trial.endsAt)}. الدروس ما زالت مفتوحة ولا يوجد حجب.`, `Trial ended ${fmt(b.trial.endsAt)}. Lessons remain open; nothing is blocked.`)}</p>
                  {b.isGuest && <Link href="/sign-up" className="press inline-block rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground" data-testid="link-premium-signup">{t('إنشاء حساب', 'Create account')}</Link>}
                </div>
              )}
            </Card>
          )}

          <p className="text-sm">{t('تشمل الخطتان كامل دروس الأمهرية والمحادثات العملية للمستويات المبتدئ والمتوسط والمتقدم ضمن برنامج الستة أشهر.', 'Both plans cover the full Amharic lessons and practical conversations across beginner, intermediate, and advanced levels in the six-month programme.')}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[monthly, six].map((o) => o && (
              <Card key={o.id} className={o.id === 'six_month' ? 'border-primary' : ''} data-testid={`card-offer-${o.id}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{o.id === 'monthly' ? t('شهري', 'Monthly') : t('ستة أشهر دفعة واحدة', 'Six months, once')}</p>
                <p className="font-display mt-2 text-4xl font-extrabold" data-testid={`text-price-${o.id}`}>${o.priceUsd}<span className="text-base font-medium text-muted-foreground"> {o.billing === 'monthly' ? t('/ شهر', '/ month') : t('مرة واحدة', 'one time')}</span></p>
                <p className="mt-2 text-sm text-muted-foreground" data-testid={`text-total-${o.id}`}>
                  {o.id === 'monthly'
                    ? t(`$${o.priceUsd} تتكرر طوال الدورة: $${o.sixMonthTotalUsd} لستة أشهر.`, `$${o.priceUsd} repeated over the course: $${o.sixMonthTotalUsd} for six months.`)
                    : t(`$${o.priceUsd} مرة واحدة لوصول ${o.durationMonths} أشهر.`, `$${o.priceUsd} once for ${o.durationMonths} months of access.`)}
                </p>
                {o.id === 'monthly' && <p className="mt-2 text-sm">{t('كل دفعة تغطي شهرًا واحدًا؛ يلزم تجديد الاشتراك للمتابعة في الشهر التالي.', 'Each payment covers one month; renew to continue the following month.')}</p>}
                {o.savingsUsd > 0 && <p className="mt-3 flex items-center gap-2 text-sm font-semibold" data-testid="text-savings"><Check className="size-4 text-primary" />{t(`توفير $${o.savingsUsd} (${o.savingsPercent}%)`, `Save $${o.savingsUsd} (${o.savingsPercent}%)`)}</p>}
                <Btn className="mt-4 w-full" disabled data-testid={`button-subscribe-${o.id}`}><Lock className="size-4" />{t('الدفع غير متاح بعد', 'Checkout not available yet')}</Btn>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-pricing-note">{t('التنبيه قبل التجديد الشهري أو انتهاء الدورة بأربعة أيام، عند وجود وصول ساري. التنبيهات داخل التطبيق عند فتحه فقط، وليست بريدًا إلكترونيًا أو إشعارات في الخلفية. الدفع عبر Polar مؤجّل، ولا يتم تحصيل رسوم أو منح اشتراك مدفوع الآن.', 'When access is active, an in-app reminder appears four days before monthly renewal or course expiry. Alerts are shown when you open the app, not by email or background push. Polar payments are deferred; no charges or paid subscriptions are activated now.')}</p>
        </div>
      )}
    </Shell>
  );
}
