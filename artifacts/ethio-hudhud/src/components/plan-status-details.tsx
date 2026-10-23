import type { BillingStatus } from '@workspace/api-client-react';
import { useApp } from '@/lib/app';
import type { PlanAction } from '@/lib/plan-action';

// Status stays visible in one line; account history, timing and terms are disclosed on demand.
export function PlanStatusDetails({ bd, a, selected }: { bd: BillingStatus | undefined; a: PlanAction; selected: string | null }) {
  const { t, lang } = useApp();
  if (!bd) return null;
  const fmt = (s: string) => new Date(s).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' });
  const { paid } = a;
  const live = a.kind === 'live';
  const planLine = paid === 'six_month'
    ? t('ستة أشهر دفعة واحدة، وصول لمدة 6 أشهر، دون تجديد تلقائي.', 'Six months, one payment, 6 months of access, no auto-renewal.')
    : t('شهر واحد مقابل 29 دولاراً لكل عملية شراء تختارها، بحد أقصى ست دفعات (174 دولاراً)، دون خصم تلقائي. يُضاف الشهر التالي بعد نهاية التغطية الحالية.', 'One month for $29 per purchase you choose, max six payments ($174), no automatic charge. Early renewal adds the next month after current coverage.');
  const offer = bd.offers.find(o => o.id === paid);
  const pend = a.pendingRaw && !(paid === 'monthly' && a.resumeMonthly);
  const headline = a.pendingRaw && !pend
    ? t('لديك دفعة شهرية قيد المتابعة. يمكنك استئناف الدفع نفسه بأمان.', 'You have a monthly checkout in progress. You can safely resume that same checkout.')
    : pend
    ? t('ما زال التحقق من دفعة سابقة معلّقًا. لا تبدأ دفعًا جديدًا قبل اكتمال التحقق من الخادم.', 'Verification of an earlier payment is still pending. Do not start another checkout until the server finishes verifying.')
    : a.livePurchase
    ? (paid === 'monthly' && live ? t('الباقة الحالية سارية. التجديد اليدوي لا يحتاج بوابة الفوترة.', 'Your current plan is active. You do not need the billing portal to renew manually.') : t('لديك خطة مدفوعة سارية. لا حاجة لدفع مرة أخرى؛ الإيصالات في بوابة الفوترة.', 'You have an active paid plan. No need to pay again; receipts are in the billing portal.'))
    : a.hasPortal ? t('يمكنك مراجعة مشترياتك السابقة من بوابة الفوترة.', 'You can review past purchases in the billing portal.') : null;
  const box = 'rounded-2xl bg-secondary p-3 text-sm';
  return <div className="space-y-3">
    {headline && <p className={box} data-testid="text-live-existing">{headline}</p>}
    {a.monthlyOff && <p className={box} data-testid="text-monthly-cap-pending">{t('الدفع الشهري غير متاح حالياً بسبب الإعداد. لا رسوم.', 'Monthly checkout is unavailable because of current configuration. You are not charged.')}</p>}
    {paid === 'monthly' && !a.monthlyOff && <details className={box} data-testid="text-monthly-status" open={a.capReached}>
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{a.count !== null && a.limit !== null ? t(`الدفعات الشهرية: ${a.count} من ${a.limit}`, `Monthly payments: ${a.count} of ${a.limit}`) : t('حالة الدفعات الشهرية', 'Monthly payment status')}</summary>
      <div className="space-y-1 pb-2">
        {a.count === null && <p>{t('تعذّر تحديد عدد الدفعات؛ الدفع الشهري متوقف حتى يؤكد الخادم.', 'Payment count unavailable; monthly checkout stays off until the server confirms.')}</p>}
        {a.capReached && <p className="font-semibold">{t('بلغت الحد الأقصى: ست دفعات شهرية. لا مزيد من الدفعات الشهرية.', 'Cap reached: six monthly payments. No further monthly payments.')}</p>}
        {bd.monthlyPaidThrough && <p>{t(`مدفوع حتى ${fmt(bd.monthlyPaidThrough)}.`, `Paid through ${fmt(bd.monthlyPaidThrough)}.`)}</p>}
        {!a.capReached && !a.monthlyAllowed && bd.monthlyNextPurchaseAt && <p>{t(`يفتح التجديد في ${fmt(bd.monthlyNextPurchaseAt)}، قبل انتهاء التغطية بأربعة أيام.`, `Renewal opens ${fmt(bd.monthlyNextPurchaseAt)}, four days before coverage ends.`)}</p>}
        {!a.capReached && !a.monthlyAllowed && !bd.monthlyNextPurchaseAt && <p>{t('التجديد غير متاح الآن.', 'Renewal is not available right now.')}</p>}
        {a.resumeMonthly && <p>{t('لديك دفع شهري غير مكتمل؛ سيُستأنف الطلب نفسه.', 'You have an unfinished monthly checkout; the same one will be resumed.')}</p>}
      </div>
    </details>}
    {paid && (live || a.kind === 'sandbox') && <details className={box} data-testid="text-live-terms">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{t('الشروط والاسترداد والضريبة', 'Terms, refunds and tax')}</summary>
      <div className="space-y-2 pb-2">
        <p>{planLine}{offer ? ` $${offer.priceUsd}` : ''}</p>
        <p>{t('لا توجد استردادات طوعية، مع مراعاة حقوق المستهلك الإلزامية وشروط المشتري في Polar.', 'No voluntary refunds, subject to mandatory consumer rights and Polar buyer terms.')}</p>
        <p className="text-muted-foreground">{t('تظهر أي ضريبة واجبة والإجمالي النهائي في صفحة Polar قبل تأكيد الدفع.', 'Any applicable tax and the final total are shown by Polar before you confirm payment.')}</p>
      </div>
    </details>}
    {a.kind === 'sandbox' && <p className={box} data-testid="text-sandbox-note">{t('هذا اختبار في بيئة Polar التجريبية فقط: لا رسوم حقيقية ولا استحقاق مدفوع حقيقي، ولن يتغير وصولك للدروس.', 'This is a Polar sandbox test only: no real charges and no real paid entitlement. Your learning access does not change.')}</p>}
    {!selected && <p className="text-sm text-muted-foreground">{t('اختر خطة لترى الخطوة التالية.', 'Select a plan to see the next step.')}</p>}
  </div>;
}
