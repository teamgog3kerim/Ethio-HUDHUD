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
  const paid = b?.source === 'polar_live';
  const fmt = (s: string) => new Date(s).toLocaleString(lang === 'ar' ? 'ar' : 'en');
  const monthly = b?.offers.find((o) => o.id === 'monthly');
  const six = b?.offers.find((o) => o.id === 'six_month');
  return (
    <Shell>
      <PageHead eyebrow="Premium" title={t('خطط الاشتراك', 'Subscription plans')} sub={b?.enforcementEnabled
        ? t('بعد تجربة 48 ساعة، يلزم الاشتراك لمتابعة الدروس والمحادثات.', 'After the 48-hour trial, subscribe to continue lessons and conversations.')
        : b?.liveCheckoutEnabled
        ? t('وصول ستة أشهر مقابل 149 دولاراً دفعة واحدة. الشراء اختياري حالياً، ويبقى التعلّم مفتوحاً مؤقتاً دون حجب.', 'Six months for $149 once. Purchasing is currently optional; learning temporarily remains open without blocking.')
        : t('التعلّم مفتوح مؤقتاً. الدفع متاح فقط عندما تظهر صفحة دفع مفعّلة.', 'Learning is temporarily open. Payment is available only when an enabled checkout is shown.')} />
      {q.isLoading && <Skeleton className="h-48" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {b && (
        <div className="space-y-5">
          <Card data-testid="card-billing">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('الخطة', 'Plan')}</dt><dd className="font-semibold" data-testid="text-plan">{b.plan}</dd></div>
              {b.selectedPlan && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('اختيارك المحفوظ (ليس اشتراكًا مدفوعًا)', 'Saved choice (not a paid subscription)')}</dt><dd className="font-semibold" data-testid="text-selected-plan">{b.selectedPlan === 'trial' ? t('تجربة مجانية', 'Free trial') : b.selectedPlan === 'monthly' ? t('شهري', 'Monthly') : t('ستة أشهر', 'Six months')}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('الدفع', 'Checkout')}</dt><dd className="font-semibold" data-testid="text-configured">{b.liveCheckoutEnabled ? t('149 دولاراً مرة واحدة عبر Polar', '$149 once through Polar') : t('غير متاح حالياً', 'Currently unavailable')}</dd></div>
              {b.dailyAiLimit !== undefined && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('طلبات المعلّم / 24 ساعة', 'AI requests / 24 hours')}</dt><dd>{b.dailyAiLimit}</dd></div>}
              {comp && b.accessExpiresAt && <div className="flex flex-wrap justify-between gap-3"><dt className="text-muted-foreground">{t('انتهاء المنحة المجانية', 'Complimentary expiry')}</dt><dd data-testid="text-access-expiry">{fmt(b.accessExpiresAt)}</dd></div>}
              {paid && b.accessExpiresAt && <div className="flex flex-wrap justify-between gap-3"><dt className="text-muted-foreground">{t('الوصول المدفوع حتى', 'Paid access until')}</dt><dd data-testid="text-paid-expiry">{fmt(b.accessExpiresAt)}</dd></div>}
            </dl>
            <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm" dir="auto" data-testid="text-billing-message">{lang === 'ar' ? b.message : comp ? 'You have a temporary administrator grant, not a paid subscription.' : paid ? 'Your payment is verified. Your paid access ends on the date shown above.' : b.paymentVerificationPending ? 'Payment verification is pending. Do not pay again while we check.' : b.liveCheckoutEnabled ? 'Optional six-month access is $149 once, with no automatic renewal. Monthly checkout is unavailable. Learning temporarily remains open after the 48-hour trial; blocking is off. You are charged only if you complete checkout.' : 'Checkout is currently unavailable. Learning temporarily remains open; blocking is off.'}</p>
          </Card>

          {!comp && !paid && (
            <Card data-testid="card-trial">
              <h2 className="font-display text-lg font-bold">{t('التجربة المجانية 48 ساعة', 'Free 48-hour trial')}</h2>
              {b.trial.state === 'active' ? (
                <p className="mt-2 text-sm" data-testid="text-trial-countdown">{t(`متبقٍ ${b.trial.daysRemaining} يوم، وتنتهي ${fmt(b.trial.endsAt)}.`, `${b.trial.daysRemaining} day(s) left; ends ${fmt(b.trial.endsAt)}.`)}</p>
              ) : (
                <div className="mt-2 space-y-3 text-sm" data-testid="text-trial-expired">
                  <p>{!b.fullCourseAccess
                    ? t('انتهت التجربة. اختر اشتراكاً شهرياً أو لستة أشهر للمتابعة. تقدمك محفوظ.', 'Your trial has ended. Choose monthly or six-month access to continue. Your progress is saved.')
                    : t(`انتهت التجربة في ${fmt(b.trial.endsAt)}. الدروس ما زالت مفتوحة ولا يوجد حجب.`, `Trial ended ${fmt(b.trial.endsAt)}. Lessons remain open; nothing is blocked.`)}</p>
                  {b.isGuest && <Link href="/sign-up" className="press inline-block rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground" data-testid="link-premium-signup">{t('إنشاء حساب', 'Create account')}</Link>}
                </div>
              )}
              <Link href={b.enforcementEnabled && b.trial.state === 'expired' ? '/choose-plan' : '/choose-plan?plan=trial'} className="press mt-3 inline-block rounded-xl border border-primary px-4 py-2 font-semibold text-primary">{b.enforcementEnabled && b.trial.state === 'expired' ? t('اختيار اشتراك', 'Choose a subscription') : t('اختر التجربة وتابع التعلّم', 'Choose trial and continue learning')}</Link>
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
                {o.id === 'monthly' && <p className="mt-2 text-sm" data-testid="text-monthly-unavailable">{t('خطة مقترحة غير متاحة للشراء حالياً. يمكنك حفظ تفضيلك فقط دون دفع.', 'Proposed plan, currently unavailable to purchase. You may save a preference only, without payment.')}</p>}
                {o.id === 'six_month' && <p className="mt-2 text-sm">{t('لا تجديد تلقائي. تظهر أي ضريبة واجبة في صفحة Polar قبل إتمام الدفع.', 'No automatic renewal. Any applicable tax is shown by Polar before you complete payment.')}</p>}
                {o.savingsUsd > 0 && <p className="mt-3 flex items-center gap-2 text-sm font-semibold" data-testid="text-savings"><Check className="size-4 text-primary" />{t(`توفير $${o.savingsUsd} (${o.savingsPercent}%)`, `Save $${o.savingsUsd} (${o.savingsPercent}%)`)}</p>}
                <Link href={`/choose-plan?plan=${o.id}`} className="press mt-4 block rounded-2xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground" data-testid={`link-select-${o.id}`}>{o.id === 'monthly' ? t('حفظ تفضيل فقط', 'Save preference only') : t('عرض خطة الستة أشهر', 'View six-month plan')}</Link>
                <Btn className="mt-3 w-full" disabled data-testid={`button-subscribe-${o.id}`}><Lock className="size-4" />{t('الدفع غير متاح بعد', 'Checkout not available yet')}</Btn>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-pricing-note">{t('تظهر تنبيهات التطبيق قبل انتهاء الوصول الموثّق بأربعة أيام. إشعارات الخلفية اختيارية وتعتمد على الإعداد ودعم الجهاز وإذنك؛ راجع إعدادات التذكير لحالة التسليم. هذه التذكيرات لا ترسل بريداً إلكترونياً. حفظ الخطة ليس دفعاً؛ شراء الستة أشهر يتطلب إتمام الدفع عبر Polar. لا استردادات طوعية، مع مراعاة حقوق المستهلك الإلزامية وشروط المشتري في Polar.', 'In-app alerts appear four days before verified access expires. Optional background notifications depend on setup, device support and permission; check reminder settings for delivery status. These reminders do not send email. Saving a plan is not payment; a six-month purchase requires completing Polar checkout. No voluntary refunds, subject to mandatory consumer rights and Polar buyer terms.')}</p>
        </div>
      )}
    </Shell>
  );
}
