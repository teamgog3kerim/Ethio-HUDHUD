import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { createSandboxPortal, getGetSandboxCheckoutQueryKey, useGetSandboxCheckout } from '@workspace/api-client-react';
import { Shell } from '@/components/shell';
import { Btn, Card, ErrorState, LinkBtn, PageHead, Skeleton } from '@/components/bits';
import { safePolarUrl } from '@/components/course-plans';
import { useApp } from '@/lib/app';

const MAX_POLLS = 12;

function Verified({ id, userId }: { id: string; userId: string }) {
  const { t } = useApp();
  const cache = useQueryClient();
  const q = useGetSandboxCheckout(id, {
    query: {
      queryKey: [...getGetSandboxCheckoutQueryKey(id), userId],
      refetchInterval: (query) => (query.state.data?.status === 'pending' && query.state.dataUpdateCount < MAX_POLLS ? 5000 : false),
      retry: 1,
    },
  });
  const identity = useRef(userId);
  identity.current = userId;
  const alive = useRef(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const openPortal = async () => {
    if (portalBusy) return;
    const owner = userId;
    setPortalBusy(true);
    setPortalError(false);
    try {
      const r = await createSandboxPortal();
      if (!alive.current || identity.current !== owner) return;
      const url = safePolarUrl(r.url);
      if (!url) { setPortalError(true); setPortalBusy(false); return; }
      window.location.assign(url);
    } catch {
      if (alive.current && identity.current === owner) { setPortalError(true); setPortalBusy(false); }
    }
  };
  const c = q.data;
  const stalled = c?.status === 'pending' && c.id === id && (cache.getQueryState(q.queryKey)?.dataUpdateCount ?? 0) >= MAX_POLLS;
  const until = c?.accessUntil ? new Date(c.accessUntil).toLocaleDateString() : null;
  const testNote = t('هذا اختبار في بيئة Polar التجريبية فقط: لا رسوم حقيقية ولا استحقاق مدفوع حقيقي، ولم يتغير وصولك للدروس.', 'Sandbox test only: no real charges and no real paid entitlement. Your learning access has not changed.');
  if (q.isError) return <ErrorState what={t('التحقق من الدفع التجريبي', 'verifying the sandbox checkout')} onRetry={() => void q.refetch()} />;
  if (!c) return <Skeleton className="h-48" />;
  const nav = <div className="mt-4 flex flex-wrap gap-3">
    <LinkBtn href="/learn" testId="link-return-learn">{t('تابع إلى الدروس', 'Continue to lessons')}</LinkBtn>
    <LinkBtn href="/choose-plan" variant="outline" testId="link-return-plans">{t('العودة إلى الخطط', 'Back to plans')}</LinkBtn>
  </div>;
  return <Card aria-live="polite" data-testid={`state-checkout-${c.status}`}>
    {c.status === 'pending' && <>
      <h2 className="font-display text-xl font-extrabold">{t('نتحقق من الدفع التجريبي…', 'Verifying your sandbox checkout…')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{stalled ? t('ما زال التحقق معلّقًا. جرّب مجددًا بعد قليل.', 'Verification is still pending. Try again shortly.') : t('نتحقق من الخادم كل 5 ثوانٍ.', 'Checking with the server every 5 seconds.')}</p>
      <Btn className="mt-4" variant="outline" disabled={q.isFetching} onClick={() => void q.refetch()} data-testid="button-checkout-retry">{q.isFetching ? t('جارٍ التحقق…', 'Checking…') : t('تحقق مجددًا', 'Check again')}</Btn>
    </>}
    {c.status === 'paid' && <>
      <h2 className="font-display text-xl font-extrabold">{t('تم التحقق من الدفع التجريبي', 'Sandbox purchase verified')}</h2>
      {until && <p className="mt-2 text-sm">{t(`تاريخ الاختبار: ${until}`, `Test period until ${until}`)}</p>}
      {c.cancelAtPeriodEnd && <p className="mt-1 text-sm text-muted-foreground">{t('سيُلغى عند نهاية الفترة.', 'Set to cancel at period end.')}</p>}
      <p className="mt-2 text-sm text-muted-foreground">{testNote}</p>
      {portalError && <div className="mt-3"><ErrorState what={t('فتح بوابة الفوترة التجريبية', 'opening the sandbox billing portal')} onRetry={() => void openPortal()} /></div>}
      <Btn className="mt-4" variant="outline" disabled={portalBusy} onClick={() => void openPortal()} data-testid="button-sandbox-portal">{portalBusy ? t('جارٍ فتح البوابة…', 'Opening portal…') : t('افتح بوابة الفوترة التجريبية', 'Open sandbox billing portal')}</Btn>
    </>}
    {c.status === 'refunded' && <>
      <h2 className="font-display text-xl font-extrabold">{t('تم استرداد الدفع التجريبي', 'Sandbox purchase refunded')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{testNote}</p>
    </>}
    {c.status === 'expired' && <>
      <h2 className="font-display text-xl font-extrabold">{t('انتهت صلاحية جلسة الدفع', 'Checkout expired')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{testNote}</p>
    </>}
    {c.status === 'failed' && <>
      <h2 className="font-display text-xl font-extrabold">{t('لم يكتمل الدفع التجريبي', 'Sandbox checkout did not complete')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{testNote}</p>
    </>}
    {nav}
  </Card>;
}

export default function PaymentReturn() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { t } = useApp();
  const [location] = useLocation();
  if (!isLoaded) return <Skeleton className="m-8 h-64" />;
  if (!isSignedIn || !userId) return <Redirect to="/sign-in" replace />;
  const id = new URLSearchParams(window.location.search).get('checkout_id');
  const cancel = location.includes('/billing/cancel');
  return <Shell>
    <PageHead title={cancel ? t('أُلغي الدفع التجريبي', 'Sandbox checkout cancelled') : t('نتيجة الدفع التجريبي', 'Sandbox checkout result')} sub={t('اختبار فقط: لا رسوم حقيقية ولا استحقاق مدفوع حقيقي.', 'Test only: no real charges and no real paid entitlement.')} />
    {cancel || !id
      ? <Card data-testid="state-checkout-cancelled">
          <p className="text-sm text-muted-foreground">{cancel ? t('لم يحدث أي خصم. يمكنك المتابعة في التعلّم أو العودة إلى الخطط.', 'Nothing was charged. Keep learning or return to plans.') : t('رابط العودة لا يحتوي على معرّف دفع.', 'This return link has no checkout id.')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkBtn href="/learn">{t('تابع إلى الدروس', 'Continue to lessons')}</LinkBtn>
            <LinkBtn href="/choose-plan" variant="outline">{t('العودة إلى الخطط', 'Back to plans')}</LinkBtn>
          </div>
        </Card>
      : <Verified key={`${userId}:${id}`} id={id} userId={userId} />}
  </Shell>;
}
