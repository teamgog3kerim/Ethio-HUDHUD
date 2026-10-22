import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { createSandboxCheckout, getGetBillingStatusQueryKey, selectCoursePlan } from '@workspace/api-client-react';
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
  const sandbox = !!paid && billing.data?.sandboxCheckoutEnabled === true;
  const checkout = async () => {
    if (!paid || !userId || checkingOut || saving) return;
    const owner = userId, request = ++version.current;
    setCheckingOut(true);
    setCheckoutError(null);
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
  if (!isLoaded) return <Skeleton className="m-8 h-64" />;
  if (!isSignedIn) return <Redirect to={`/sign-up${choice ? `?plan=${choice}` : ''}`} replace />;
  return <Shell>
    <PageHead title={t('اختر خطتك وابدأ التعلّم', 'Choose your plan and start learning')} sub={t('احفظ اختيارك في حسابك، ثم انتقل إلى الدروس والمحادثات.', 'Save your choice to your account, then continue to lessons and conversations.')} />
    <CoursePlans selected={selected} onChoose={plan => { setChoice(plan); setError(false); setCheckoutError(null); }} busy={saving || checkingOut} paidOnly={billing.data?.enforcementEnabled && billing.data.trial.state === 'expired'} />
    <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm text-muted-foreground">{billing.data?.enforcementEnabled
        ? t('التجربة مدتها 48 ساعة من أول استخدام. اختيار الخطة أو إنشاء حساب جديد لا يعيد التجربة ولا يفتح الدروس دون استحقاق موثّق.', 'The trial lasts 48 hours from first use. Selecting a plan or signing up does not restart it or unlock lessons without verified access.')
        : selected === 'monthly' || selected === 'six_month'
        ? t('سيُحفظ هذا الاختيار كتفضيل فقط. لم يتم الدفع أو تفعيل اشتراك مدفوع. يمكنك التعلّم مجانًا خلال المرحلة التجريبية حتى تفعيل Polar.', 'This saves a preference only. No payment or paid subscription is activated. You can learn free during the pilot until Polar is enabled.')
        : t('التجربة مدتها 48 ساعة من أول استخدام، ولا تبدأ مجددًا عند إنشاء الحساب أو تغيير الخطة. يبقى التعلّم مفتوحًا خلال المرحلة التجريبية.', 'Your trial lasts 48 hours from first use; signing up or changing plans does not restart it. Learning stays open during the pilot.')}</p>
      {sandbox && <p className="rounded-2xl bg-secondary p-3 text-sm" data-testid="text-sandbox-note">{t('هذا اختبار في بيئة Polar التجريبية فقط: لا رسوم حقيقية ولا استحقاق مدفوع حقيقي، ولن يتغير وصولك للدروس.', 'This is a Polar sandbox test only: no real charges and no real paid entitlement. Your learning access does not change.')}</p>}
      {checkoutError && <div role="alert"><p className="text-sm text-destructive">{checkoutError}</p><ErrorState what={t('بدء الدفع التجريبي', 'starting sandbox checkout')} onRetry={() => void checkout()} /></div>}
      {sandbox && <Btn disabled={checkingOut || saving || !billing.data} onClick={() => void checkout()} data-testid="button-sandbox-checkout">
        {checkingOut ? t('جارٍ فتح الدفع التجريبي…', 'Opening sandbox checkout…') : t('ابدأ الدفع التجريبي (بدون رسوم)', 'Start sandbox checkout (no charge)')}
      </Btn>}
      {error && <ErrorState what={t('حفظ اختيار الخطة', 'saving your plan choice')} onRetry={() => void save()} />}
      <Btn variant={sandbox ? 'outline' : undefined} disabled={!selected || saving || checkingOut || !billing.data || billing.isError} onClick={() => void save()} data-testid="button-plan-continue">
        {saving ? t('جارٍ حفظ الاختيار…', 'Saving your choice…') : billing.data?.enforcementEnabled && !billing.data.fullCourseAccess
          ? t('احفظ اختيار الاشتراك (لا يفتح الدروس)', 'Save subscription choice (does not unlock lessons)')
          : t('احفظ الاختيار وتابع إلى الدروس', 'Save choice and continue to lessons')}
      </Btn>
    </div>
  </Shell>;
}
