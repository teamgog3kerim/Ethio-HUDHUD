import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { createLiveCheckout, createLivePortal, createSandboxCheckout, getGetBillingStatusQueryKey, selectCoursePlan } from '@workspace/api-client-react';
import { CoursePlans, safePolarUrl } from '@/components/course-plans';
import { PlanStatusDetails } from '@/components/plan-status-details';
import { Shell } from '@/components/shell';
import { Btn, PageHead, Skeleton } from '@/components/bits';
import { useBilling } from '@/components/billing-notice';
import { useApp } from '@/lib/app';
import { planAction } from '@/lib/plan-action';
import { parsePlanChoice, type PlanChoice } from '@/lib/plan-choice';

type Op = 'trial' | 'sandbox' | 'live' | 'portal';

export default function ChoosePlan() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { t, lang } = useApp();
  const [, navigate] = useLocation();
  const billing = useBilling();
  const cache = useQueryClient();
  const [choice, setChoice] = useState<PlanChoice | null>(() => parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorOp, setErrorOp] = useState<'main' | 'portal2'>('main');
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const identity = useRef(userId);
  const version = useRef(0);
  identity.current = userId;
  useEffect(() => {
    // A late response from another account must not navigate or populate cache.
    version.current++;
    busyRef.current = false; setBusy(false); setError(null); setNotice(null);
    setChoice(parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
    return () => { version.current++; };
  }, [userId]);

  const bd = billing.data;
  const trialHidden = !!bd?.enforcementEnabled && bd.trial.state === 'expired';
  const requested = choice ?? parsePlanChoice(bd?.paidPlan) ?? parsePlanChoice(bd?.selectedPlan);
  const selected = trialHidden && requested === 'trial' ? null : requested;
  const a = planAction(bd, selected, !!isSignedIn, billing.isError);
  const paid = a.paid;

  const run = async (op: Op) => {
    if (!userId || busyRef.current || a.kind !== op) return;
    const owner = userId, request = ++version.current;
    const current = () => identity.current === owner && version.current === request;
    busyRef.current = true; setBusy(true); setError(null); setErrorOp('main'); setNotice(null);
    const done = () => { busyRef.current = false; setBusy(false); };
    const fail = (e: unknown, fallback: string) => {
      if (!current()) return;
      const detail = (e as { data?: { error?: unknown } }).data?.error;
      setError(typeof detail === 'string' ? detail : fallback);
      done();
    };
    const go = (raw: string | null | undefined, env: 'sandbox' | 'live', bad: string) => {
      const url = safePolarUrl(raw, env);
      if (!url) { setError(bad); done(); return; }
      window.location.assign(url);
    };
    try {
      if (op === 'trial' && selected) {
        const result = await selectCoursePlan({ plan: selected });
        if (!current()) return;
        cache.setQueryData(getGetBillingStatusQueryKey(), result);
        if (result.fullCourseAccess) navigate('/learn');
        else setNotice(t('حُفظت التجربة. تُفتح الدروس عند توثيق الاستحقاق من الخادم.', 'Trial saved. Lessons open once the server verifies access.'));
        done();
      } else if (op === 'sandbox' && paid) {
        const r = await createSandboxCheckout({ plan: paid });
        if (current()) go(r.checkoutUrl, 'sandbox', t('تعذر التحقق من رابط الدفع التجريبي.', 'Could not verify the sandbox checkout URL.'));
      } else if (op === 'live' && paid) {
        const r = await createLiveCheckout({ plan: paid });
        if (current()) go(r.checkoutUrl, 'live', t('تعذر التحقق من رابط الدفع.', 'Could not verify the checkout URL.'));
      } else if (op === 'portal') {
        const r = await createLivePortal();
        if (current()) go(r.url, 'live', t('تعذر التحقق من رابط البوابة.', 'Could not verify the portal URL.'));
      }
    } catch (e) {
      fail(e, op === 'portal' ? t('تعذر فتح بوابة الفوترة.', 'Could not open the billing portal.')
        : op === 'sandbox' ? t('تعذر بدء الدفع التجريبي. حاول مرة أخرى.', 'Could not start sandbox checkout. Try again.')
        : op === 'live' ? t('تعذر بدء الدفع. حاول مرة أخرى.', 'Could not start checkout. Try again.')
        : t('تعذر حفظ اختيار التجربة. حاول مرة أخرى.', 'Could not save your trial choice. Try again.'));
    }
  };
  // Secondary portal link is a live operation independent of the selected plan's main action.
  const openPortal = async () => {
    if (!userId || busyRef.current) return;
    const owner = userId, request = ++version.current;
    const current = () => identity.current === owner && version.current === request;
    busyRef.current = true; setBusy(true); setError(null); setErrorOp('portal2');
    try {
      const r = await createLivePortal();
      if (!current()) return;
      const url = safePolarUrl(r.url, 'live');
      if (!url) { setError(t('تعذر التحقق من رابط البوابة.', 'Could not verify the portal URL.')); busyRef.current = false; setBusy(false); return; }
      window.location.assign(url);
    } catch (e) {
      if (!current()) return;
      const d = (e as { data?: { error?: unknown } }).data?.error;
      setError(typeof d === 'string' ? d : t('تعذر فتح بوابة الفوترة.', 'Could not open the billing portal.'));
      busyRef.current = false; setBusy(false);
    }
  };

  if (!isLoaded) return <Skeleton className="m-8 h-64" />;
  const fmt = (s: string) => new Date(s).toLocaleString(lang === 'ar' ? 'ar' : 'en');
  const retry = !!error && errorOp === 'main';
  const label: Record<string, string> = {
    signup: t('أنشئ حسابًا لمتابعة هذه الخطة', 'Create an account to continue with this plan'),
    trial: busy ? t('جارٍ الحفظ…', 'Saving…') : t('ابدأ التجربة وتابع إلى الدروس', 'Start trial and continue to lessons'),
    live: busy ? t('جارٍ فتح الدفع…', 'Opening checkout…') : t('تابع إلى الدفع الآمن عبر Polar', 'Continue to secure Polar checkout'),
    sandbox: busy ? t('جارٍ فتح الدفع التجريبي…', 'Opening sandbox checkout…') : t('ابدأ الدفع التجريبي (بدون رسوم)', 'Start sandbox checkout (no charge)'),
    status: t('تحقق من حالة الدفع', 'Check payment status'),
    refresh: t('أعد تحميل الخطط', 'Reload plans'),
    portal: busy ? t('جارٍ فتح البوابة…', 'Opening portal…') : t('افتح بوابة الفوترة', 'Open billing portal'),
  };
  const testId: Record<string, string> = { signup: 'button-plan-signup', trial: 'button-plan-continue', live: 'button-live-checkout', sandbox: 'button-sandbox-checkout', status: 'button-payment-status', refresh: 'button-retry', portal: 'button-live-portal' };
  const onMain = () => {
    if (a.kind === 'signup') navigate(`/sign-up${selected ? `?plan=${selected}` : ''}`);
    else if (a.kind === 'status' || a.kind === 'refresh') { if (!billing.isFetching) void billing.refetch(); }
    else if (a.kind === 'trial' || a.kind === 'sandbox' || a.kind === 'live' || a.kind === 'portal') void run(a.kind);
  };
  const hasMain = ['signup', 'trial', 'sandbox', 'live', 'portal', 'status', 'refresh'].includes(a.kind);
  const comp = bd?.plan === 'complimentary';
  const paidSrc = bd?.source === 'polar_live';
  const expiry = bd?.accessExpiresAt ?? bd?.paidPeriodEndsAt;
  const gist = bd?.enforcementEnabled
    ? t('التجربة 48 ساعة من أول استخدام. اختيار خطة أو إنشاء حساب لا يعيد التجربة ولا يفتح الدروس دون استحقاق موثّق.', 'The trial lasts 48 hours from first use. Selecting a plan or signing up does not restart it or unlock lessons without verified access.')
    : t('الشراء اختياري حالياً ولا تُحصّل رسوم إلا بعد إتمام الدفع عبر Polar. يبقى التعلّم مفتوحاً مؤقتاً.', 'Purchasing is optional for now; you are charged only after completing Polar checkout. Learning temporarily stays open.');

  return <Shell>
    <PageHead title={t('الاشتراك والفوترة', 'Subscription & billing')} sub={t('اختر خطتك أدناه، ثم تابع إلى الدفع أو إدارة الفوترة من مكان واحد.', 'Choose your plan below, then continue to payment or manage billing in one place.')} />
    {bd && <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm" data-testid="card-billing">
      <p><span className="text-muted-foreground">{t('الخطة الحالية: ', 'Current plan: ')}</span><span className="font-semibold" data-testid="text-plan">{comp ? t('منحة مجانية', 'Complimentary') : bd.paidPlan === 'monthly' ? t('شهري', 'Monthly') : bd.paidPlan === 'six_month' ? t('ستة أشهر', 'Six months') : t('بدون اشتراك مدفوع', 'No paid plan')}</span></p>
      {bd.selectedPlan && <p><span className="text-muted-foreground">{t('الاختيار المحفوظ: ', 'Saved choice: ')}</span><span className="font-semibold" data-testid="text-selected-plan">{bd.selectedPlan === 'trial' ? t('تجربة مجانية', 'Free trial') : bd.selectedPlan === 'monthly' ? t('شهري', 'Monthly') : t('ستة أشهر', 'Six months')}</span></p>}
      <p className="basis-full font-semibold" data-testid="text-access-state">{comp ? t('منحة مجانية سارية', 'Complimentary access is active') : paidSrc && bd.fullCourseAccess ? t('وصول مدفوع موثّق وساري', 'Verified paid access is active') : bd.hasLivePurchase || bd.paidPlan ? t('انتهى الوصول المدفوع الموثّق أو لم يعد ساريًا', 'Verified paid access has ended or is not active') : bd.isGuest ? t('زائر: لا وصول مدفوع', 'Guest: no paid access') : t('لا وصول مدفوع موثّق', 'No verified paid access')}</p>
      {comp && expiry && <p data-testid="text-access-expiry"><span className="text-muted-foreground">{t('انتهاء المنحة: ', 'Complimentary expiry: ')}</span>{fmt(expiry)}</p>}
      {paidSrc && expiry && <p data-testid="text-paid-expiry"><span className="text-muted-foreground">{t('الوصول المدفوع حتى: ', 'Paid access until: ')}</span>{fmt(expiry)}</p>}
      {!comp && !paidSrc && bd.trial.state === 'active' && <p data-testid="card-trial"><span data-testid="text-trial-countdown">{t(`التجربة: متبقٍ ${bd.trial.daysRemaining} يوم، تنتهي ${fmt(bd.trial.endsAt)}`, `Trial: ${bd.trial.daysRemaining} day(s) left, ends ${fmt(bd.trial.endsAt)}`)}</span></p>}
      {bd.trial.state === 'expired' && !comp && !paidSrc && <p data-testid="card-trial"><span data-testid="text-trial-expired">{bd.fullCourseAccess ? t('انتهت التجربة. الدروس ما زالت مفتوحة.', 'Trial ended. Lessons remain open.') : t('انتهت التجربة. اختر اشتراكاً للمتابعة. تقدمك محفوظ.', 'Your trial has ended. Choose a subscription to continue. Your progress is saved.')}</span></p>}
    </div>}
    <CoursePlans selected={selected} onChoose={plan => { setChoice(plan); setError(null); setNotice(null); }} busy={busy} paidOnly={trialHidden} />
    <section className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5" aria-live="polite" aria-busy={busy || billing.isLoading} data-testid="section-plan-action">
      <h2 className="font-display text-xl font-bold">{t('راجع اختيارك وتابع', 'Review your choice and continue')}</h2>
      {selected && <p className="font-semibold" data-testid="text-checkout-summary">{selected === 'trial'
        ? t('تجربة مجانية · 48 ساعة · دون دفع', 'Free trial · 48 hours · no payment')
        : selected === 'monthly'
          ? t(`شهر واحد · $${bd?.offers.find(o => o.id === 'monthly')?.priceUsd ?? 29} · دفع يدوي`, `One month · $${bd?.offers.find(o => o.id === 'monthly')?.priceUsd ?? 29} · manual payment`)
          : t(`ستة أشهر · $${bd?.offers.find(o => o.id === 'six_month')?.priceUsd ?? 149} · دفعة واحدة`, `Six months · $${bd?.offers.find(o => o.id === 'six_month')?.priceUsd ?? 149} · one payment`)}</p>}
      <p className="text-sm text-muted-foreground" data-testid="text-billing-message">{gist}</p>
      {billing.isLoading && <Skeleton className="h-12" />}
      <PlanStatusDetails bd={bd} a={a} selected={selected} />
      {notice && <p className="rounded-2xl bg-secondary p-3 text-sm" role="status">{notice}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {billing.isError && <p className="text-sm text-destructive" role="alert">{t('تعذّر تحميل أو تحديث بيانات الفوترة. الإجراءات متوقفة حتى إعادة التحميل.', 'Could not load or refresh billing data. Actions are paused until it reloads.')}</p>}
      {billing.isError && !bd ? <Btn className="w-full" onClick={() => void billing.refetch()} data-testid="button-retry">{t('إعادة المحاولة', 'Retry')}</Btn>
        : hasMain ? <Btn className="min-h-11 w-full" disabled={busy || ((a.kind === 'status' || a.kind === 'refresh') && billing.isFetching)} onClick={onMain} data-testid={testId[a.kind]} data-action={a.kind}>
          {retry && a.kind !== 'signup' ? `${t('إعادة المحاولة: ', 'Retry: ')}${label[a.kind]}` : label[a.kind]}
        </Btn> : null}
      {a.kind === 'unavailable' && <p className="text-sm text-muted-foreground" data-testid="text-plan-unavailable">{t('لا إجراء متاحاً لهذه الخطة الآن؛ راجع التفاصيل أعلاه.', 'No action is available for this plan right now; see the details above.')}</p>}
      {a.portalSecondary && <button type="button" disabled={busy || billing.isError} onClick={() => void openPortal()} className="press inline-flex min-h-11 items-center text-sm font-semibold text-primary underline" data-testid="link-live-portal">{errorOp === 'portal2' && error ? t('إعادة المحاولة: بوابة الفوترة', 'Retry: billing portal') : t('الإيصالات والسجل في بوابة الفوترة', 'Receipts and history in the billing portal')}</button>}
      <p className="text-xs text-muted-foreground" data-testid="text-pricing-note">{t('تظهر تنبيهات التطبيق قبل انتهاء الوصول الموثّق بأربعة أيام ولا ترسل بريداً إلكترونياً. لا استردادات طوعية، مع مراعاة حقوق المستهلك الإلزامية وشروط المشتري في Polar.', 'In-app alerts appear four days before verified access expires and do not send email. No voluntary refunds, subject to mandatory consumer rights and Polar buyer terms.')}</p>
    </section>
  </Shell>;
}
