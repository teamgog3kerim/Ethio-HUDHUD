import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { createLiveCheckout, createLivePortal, createSandboxCheckout, getGetBillingStatusQueryKey, selectCoursePlan } from '@workspace/api-client-react';
import { CoursePlans, safePolarUrl } from '@/components/course-plans';
import { Shell } from '@/components/shell';
import { Btn, ErrorState, PageHead, Skeleton } from '@/components/bits';
import { useBilling } from '@/components/billing-notice';
import { useApp } from '@/lib/app';
import { parsePlanChoice, type PlanChoice } from '@/lib/plan-choice';

export default function ChoosePlan() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { t } = useApp();
  const [, navigate] = useLocation();
  const billing = useBilling();
  const cache = useQueryClient();
  const [choice, setChoice] = useState<PlanChoice | null>(() => parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [retryOperation, setRetryOperation] = useState<'sandbox' | 'live' | 'portal'>('sandbox');
  const identity = useRef(userId);
  const version = useRef(0);
  identity.current = userId;
  useEffect(() => {
    // A late response from another account must not navigate or populate cache.
    version.current++;
    setSaving(false);
    setCheckingOut(false);
    setCheckoutError(null);
    setError(false);
    setChoice(parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
    return () => { version.current++; };
  }, [userId]);
  const requested = choice ?? parsePlanChoice(billing.data?.selectedPlan);
  const selected = billing.data?.enforcementEnabled && billing.data.trial.state === 'expired' && requested === 'trial' ? null : requested;
  const save = async () => {
    if (!selected || !userId || saving) return;
    const owner = userId, request = ++version.current;
    setSaving(true);
    setError(false);
    try {
      const result = await selectCoursePlan({ plan: selected });
      if (identity.current !== owner || version.current !== request) return;
      cache.setQueryData(getGetBillingStatusQueryKey(), result);
      // A stored preference is not payment and must not bypass the access gate.
      if (result.fullCourseAccess) navigate('/learn');
    } catch {
      if (identity.current === owner && version.current === request) setError(true);
    } finally {
      if (identity.current === owner && version.current === request) setSaving(false);
    }
  };
  const paid = selected === 'monthly' || selected === 'six_month' ? selected : null;
  const sandbox = !!paid && billing.data?.sandboxCheckoutEnabled === true && billing.data?.liveCheckoutEnabled !== true;
  const checkout = async () => {
    if (!paid || !userId || checkingOut || saving) return;
    const owner = userId, request = ++version.current;
    setCheckingOut(true);
    setCheckoutError(null);
    setRetryOperation('sandbox');
    try {
      const result = await createSandboxCheckout({ plan: paid });
      if (identity.current !== owner || version.current !== request) return;
      const url = safePolarUrl(result.checkoutUrl);
      if (!url) { setCheckoutError(t('تعذر التحقق من رابط الدفع التجريبي.', 'Could not verify the sandbox checkout URL.')); setCheckingOut(false); return; }
      window.location.assign(url);
    } catch (error) {
      if (identity.current === owner && version.current === request) {
        const detail = (error as { data?: { error?: unknown } }).data?.error;
        setCheckoutError(typeof detail === 'string' ? detail : t('تعذر بدء الدفع التجريبي. حاول مرة أخرى.', 'Could not start sandbox checkout. Try again.'));
        setCheckingOut(false);
      }
    }
  };
  const bd = billing.data;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
  const resumeMonthly = bd?.resumablePlan === 'monthly';
  const count = typeof bd?.monthlyPaymentCount === 'number' ? bd.monthlyPaymentCount : null;
  const limit = typeof bd?.monthlyPaymentLimit === 'number' ? bd.monthlyPaymentLimit : null;
  const capReached = count !== null && limit !== null && count >= limit;
  const monthlyAllowed = bd?.monthlyCanPurchase === true || resumeMonthly;
  const livePurchase = (!!bd?.paidPlan && bd.fullCourseAccess === true)
    || !!(bd?.monthlyPaidThrough && Date.parse(bd.monthlyPaidThrough) > Date.now());
  const hasPortal = bd?.hasLivePurchase === true;
  const pendingRaw = bd?.paymentVerificationPending === true;
  const pending = pendingRaw && !(paid === 'monthly' && resumeMonthly);
  const live = !!paid && bd?.liveCheckoutEnabled === true && (paid === 'six_month' || (bd?.liveMonthlyCheckoutEnabled === true && monthlyAllowed));
  const paidBlock = livePurchase && !(paid === 'monthly' && live);
  const monthlyOff = paid === 'monthly' && bd?.liveMonthlyCheckoutEnabled !== true;
  const liveCheckout = async () => {
    if (!paid || !userId || checkingOut || saving || !live || paidBlock || pending) return;
    const owner = userId, request = ++version.current;
    setCheckingOut(true);
    setCheckoutError(null);
    setRetryOperation('live');
    try {
      const result = await createLiveCheckout({ plan: paid });
      if (identity.current !== owner || version.current !== request) return;
      const url = safePolarUrl(result.checkoutUrl, 'live');
      if (!url) { setCheckoutError(t('تعذر التحقق من رابط الدفع.', 'Could not verify the checkout URL.')); setCheckingOut(false); return; }
      window.location.assign(url);
    } catch (e) {
      if (identity.current === owner && version.current === request) {
        const detail = (e as { data?: { error?: unknown } }).data?.error;
        setCheckoutError(typeof detail === 'string' ? detail : t('تعذر بدء الدفع. حاول مرة أخرى.', 'Could not start checkout. Try again.'));
        setCheckingOut(false);
      }
    }
  };
  const portal = async () => {
    if (!userId || checkingOut) return;
    const owner = userId;
    setCheckingOut(true);
    setCheckoutError(null);
    setRetryOperation('portal');
    try {
      const r = await createLivePortal();
      if (identity.current !== owner) return;
      const url = safePolarUrl(r.url, 'live');
      if (!url) { setCheckoutError(t('تعذر التحقق من رابط البوابة.', 'Could not verify the portal URL.')); setCheckingOut(false); return; }
      window.location.assign(url);
    } catch (e) {
      if (identity.current === owner) {
        const detail = (e as { data?: { error?: unknown } }).data?.error;
        setCheckoutError(typeof detail === 'string' ? detail : t('تعذر فتح بوابة الفوترة.', 'Could not open the billing portal.'));
        setCheckingOut(false);
      }
    }
  };
  const planLine = paid === 'six_month'
    ? t('ستة أشهر دفعة واحدة، وصول لمدة 6 أشهر، دون تجديد تلقائي.', 'Six months, one payment, 6 months of access, no auto-renewal.')
    : t('شهر واحد مقابل 29 دولاراً لكل عملية شراء تختارها، بحد أقصى ست دفعات (174 دولاراً)، دون خصم تلقائي. يُضاف الشهر التالي بعد نهاية التغطية الحالية.', 'One month for $29 per purchase you choose, max six payments ($174), no automatic charge. Early renewal adds the next month after current coverage.');
  const offer = bd?.offers.find(o => o.id === paid);
  if (!isLoaded) return <Skeleton className="m-8 h-64" />;
  if (!isSignedIn) return <Redirect to={`/sign-up${choice ? `?plan=${choice}` : ''}`} replace />;
  return <Shell>
    <PageHead title={t('اختر خطتك وابدأ التعلّم', 'Choose your plan and start learning')} sub={t('احفظ اختيارك في حسابك، ثم انتقل إلى الدروس والمحادثات.', 'Save your choice to your account, then continue to lessons and conversations.')} />
    <CoursePlans selected={selected} onChoose={plan => { setChoice(plan); setError(false); setCheckoutError(null); }} busy={saving || checkingOut} paidOnly={billing.data?.enforcementEnabled && billing.data.trial.state === 'expired'} />
    <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm text-muted-foreground">{billing.data?.enforcementEnabled
        ? t('التجربة مدتها 48 ساعة من أول استخدام. اختيار الخطة أو إنشاء حساب جديد لا يعيد التجربة ولا يفتح الدروس دون استحقاق موثّق.', 'The trial lasts 48 hours from first use. Selecting a plan or signing up does not restart it or unlock lessons without verified access.')
        : bd?.liveCheckoutEnabled
        ? t('حفظ الاختيار لا يُعدّ دفعاً. الشراء اختياري حالياً، ولا تُحصّل رسوم إلا بعد إتمام الدفع عبر Polar. يبقى التعلّم مفتوحاً مؤقتاً حتى بعد انتهاء تجربة 48 ساعة؛ الحجب غير مفعّل.', 'Saving a choice is not payment. Purchasing is currently optional; charges occur only when you complete Polar checkout. Learning temporarily remains open after the 48-hour trial; blocking is off.')
        : selected === 'monthly' || selected === 'six_month'
        ? t('سيُحفظ هذا الاختيار كتفضيل فقط. لم يتم الدفع أو تفعيل اشتراك مدفوع. يمكنك التعلّم مجانًا خلال المرحلة التجريبية حتى تفعيل Polar.', 'This saves a preference only. No payment or paid subscription is activated. You can learn free during the pilot until Polar is enabled.')
        : t('التجربة مدتها 48 ساعة من أول استخدام، ولا تبدأ مجددًا عند إنشاء الحساب أو تغيير الخطة. يبقى التعلّم مفتوحًا خلال المرحلة التجريبية.', 'Your trial lasts 48 hours from first use; signing up or changing plans does not restart it. Learning stays open during the pilot.')}</p>
      {sandbox && <p className="rounded-2xl bg-secondary p-3 text-sm" data-testid="text-sandbox-note">{t('هذا اختبار في بيئة Polar التجريبية فقط: لا رسوم حقيقية ولا استحقاق مدفوع حقيقي، ولن يتغير وصولك للدروس.', 'This is a Polar sandbox test only: no real charges and no real paid entitlement. Your learning access does not change.')}</p>}
      {checkoutError && <div role="alert"><p className="text-sm text-destructive">{checkoutError}</p><ErrorState what={retryOperation === 'portal' ? t('فتح بوابة الفوترة', 'opening the billing portal') : retryOperation === 'live' ? t('بدء الدفع', 'starting checkout') : t('بدء الدفع التجريبي', 'starting sandbox checkout')} onRetry={() => void (retryOperation === 'portal' ? portal() : retryOperation === 'live' ? liveCheckout() : checkout())} /></div>}
      {(pendingRaw || livePurchase || hasPortal) && <div className="rounded-2xl bg-secondary p-3 text-sm" data-testid="text-live-existing">
        <p>{pendingRaw && !pending ? t('لديك دفعة شهرية قيد المتابعة. يمكنك استئناف الدفع نفسه بأمان.', 'You have a monthly checkout in progress. You can safely resume that same checkout.') : pending ? t('ما زال التحقق من دفعة سابقة معلّقًا. لا تبدأ دفعًا جديدًا قبل اكتمال التحقق من الخادم.', 'Verification of an earlier payment is still pending. Do not start another checkout until the server finishes verifying.') : livePurchase ? (paid === 'monthly' && live ? t('الباقة الحالية سارية. الإيصالات والسجل في بوابة الفوترة؛ التجديد اليدوي لا يحتاج إليها.', 'Your current plan is active. Receipts and history are in the billing portal; you do not need it to renew manually.') : t('لديك خطة مدفوعة سارية. لا حاجة لدفع مرة أخرى؛ الإيصالات في بوابة الفوترة.', 'You have an active paid plan. No need to pay again; receipts are in the billing portal.')) : t('يمكنك مراجعة مشترياتك السابقة من بوابة الفوترة.', 'You can review past purchases in the billing portal.')}</p>
        {hasPortal && <Btn className="mt-3" variant="outline" disabled={checkingOut} onClick={() => void portal()} data-testid="button-live-portal">{t('افتح بوابة الفوترة', 'Open billing portal')}</Btn>}
      </div>}
      {monthlyOff && <p className="rounded-2xl bg-secondary p-3 text-sm" data-testid="text-monthly-cap-pending">{t('الدفع الشهري غير متاح حالياً بسبب الإعداد. يمكنك حفظ تفضيلك فقط دون رسوم.', 'Monthly checkout is unavailable because of current configuration. Saving your preference does not charge you.')}</p>}
      {paid === 'monthly' && !monthlyOff && <div className="space-y-1 rounded-2xl bg-secondary p-3 text-sm" data-testid="text-monthly-status">
        {count !== null && limit !== null ? <p>{t(`الدفعات الشهرية: ${count} من ${limit}.`, `Monthly payments: ${count} of ${limit}.`)}</p> : <p>{t('تعذّر تحديد عدد الدفعات؛ الدفع الشهري متوقف حتى يؤكد الخادم.', 'Payment count unavailable; monthly checkout stays off until the server confirms.')}</p>}
        {capReached && <p className="font-semibold">{t('بلغت الحد الأقصى: ست دفعات شهرية. لا مزيد من الدفعات الشهرية.', 'Cap reached: six monthly payments. No further monthly payments.')}</p>}
        {bd?.monthlyPaidThrough && <p>{t(`مدفوع حتى ${fmtDate(bd.monthlyPaidThrough)}.`, `Paid through ${fmtDate(bd.monthlyPaidThrough)}.`)}</p>}
        {!capReached && !monthlyAllowed && bd?.monthlyNextPurchaseAt && <p>{t(`يفتح التجديد في ${fmtDate(bd.monthlyNextPurchaseAt)}، قبل انتهاء التغطية بأربعة أيام.`, `Renewal opens ${fmtDate(bd.monthlyNextPurchaseAt)}, four days before coverage ends.`)}</p>}
        {!capReached && !monthlyAllowed && !bd?.monthlyNextPurchaseAt && <p>{t('التجديد غير متاح الآن.', 'Renewal is not available right now.')}</p>}
        {resumeMonthly && <p>{t('لديك دفع شهري غير مكتمل؛ سيُستأنف الطلب نفسه.', 'You have an unfinished monthly checkout; the same one will be resumed.')}</p>}
      </div>}
      {live && !paidBlock && !pending && <div className="space-y-3 rounded-2xl border border-border p-3 text-sm" data-testid="text-live-terms">
        <p>{planLine}{offer ? ` $${offer.priceUsd}` : ''}</p>
        <p>{t('لا توجد استردادات طوعية، مع مراعاة حقوق المستهلك الإلزامية وشروط المشتري في Polar. حفظ التفضيل ليس دفعًا.', 'No voluntary refunds, subject to mandatory consumer rights and Polar buyer terms. Saving a preference is not payment.')}</p>
        <p className="text-sm text-muted-foreground">{t('تظهر أي ضريبة واجبة والإجمالي النهائي في صفحة Polar قبل تأكيد الدفع.', 'Any applicable tax and the final total are shown by Polar before you confirm payment.')}</p>
        <Btn disabled={checkingOut || saving || !bd} onClick={() => void liveCheckout()} data-testid="button-live-checkout">
          {checkingOut ? t('جارٍ فتح الدفع…', 'Opening checkout…') : t('تابع إلى الدفع الآمن عبر Polar', 'Continue to secure Polar checkout')}
        </Btn>
      </div>}
      {sandbox && <Btn disabled={checkingOut || saving || !billing.data} onClick={() => void checkout()} data-testid="button-sandbox-checkout">
        {checkingOut ? t('جارٍ فتح الدفع التجريبي…', 'Opening sandbox checkout…') : t('ابدأ الدفع التجريبي (بدون رسوم)', 'Start sandbox checkout (no charge)')}
      </Btn>}
      {error && <ErrorState what={t('حفظ اختيار الخطة', 'saving your plan choice')} onRetry={() => void save()} />}
      <Btn variant={sandbox || live ? 'outline' : undefined} disabled={!selected || saving || checkingOut || !billing.data || billing.isError} onClick={() => void save()} data-testid="button-plan-continue">
        {saving ? t('جارٍ حفظ الاختيار…', 'Saving your choice…') : billing.data?.enforcementEnabled && !billing.data.fullCourseAccess
          ? t('احفظ اختيار الاشتراك (لا يفتح الدروس)', 'Save subscription choice (does not unlock lessons)')
          : t('احفظ الاختيار وتابع إلى الدروس', 'Save choice and continue to lessons')}
      </Btn>
    </div>
  </Shell>;
}
