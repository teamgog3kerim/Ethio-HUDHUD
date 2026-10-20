import { useAuth } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { getGetBillingStatusQueryKey, selectCoursePlan } from '@workspace/api-client-react';
import { CoursePlans } from '@/components/course-plans';
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
  const identity = useRef(userId);
  const version = useRef(0);
  identity.current = userId;
  useEffect(() => {
    // A late response from another account must not navigate or populate cache.
    version.current++;
    setSaving(false);
    setError(false);
    setChoice(parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
    return () => { version.current++; };
  }, [userId]);
  const selected = choice ?? parsePlanChoice(billing.data?.selectedPlan);
  const save = async () => {
    if (!selected || !userId || saving) return;
    const owner = userId, request = ++version.current;
    setSaving(true);
    setError(false);
    try {
      const result = await selectCoursePlan({ plan: selected });
      if (identity.current !== owner || version.current !== request) return;
      cache.setQueryData(getGetBillingStatusQueryKey(), result);
      navigate('/learn');
    } catch {
      if (identity.current === owner && version.current === request) setError(true);
    } finally {
      if (identity.current === owner && version.current === request) setSaving(false);
    }
  };
  if (!isLoaded) return <Skeleton className="m-8 h-64" />;
  if (!isSignedIn) return <Redirect to={`/sign-up${choice ? `?plan=${choice}` : ''}`} replace />;
  return <Shell>
    <PageHead title={t('اختر خطتك وابدأ التعلّم', 'Choose your plan and start learning')} sub={t('احفظ اختيارك في حسابك، ثم انتقل إلى الدروس والمحادثات.', 'Save your choice to your account, then continue to lessons and conversations.')} />
    <CoursePlans selected={selected} onChoose={plan => { setChoice(plan); setError(false); }} busy={saving} />
    <div className="mt-6 space-y-3 rounded-3xl border border-border bg-card p-5" aria-live="polite">
      <p className="text-sm text-muted-foreground">{selected === 'monthly' || selected === 'six_month'
        ? t('سيُحفظ هذا الاختيار كتفضيل فقط. لم يتم الدفع أو تفعيل اشتراك مدفوع. يمكنك التعلّم مجانًا خلال المرحلة التجريبية حتى تفعيل Polar.', 'This saves a preference only. No payment or paid subscription is activated. You can learn free during the pilot until Polar is enabled.')
        : t('التجربة مدتها 48 ساعة من أول استخدام، ولا تبدأ مجددًا عند إنشاء الحساب أو تغيير الخطة. يبقى التعلّم مفتوحًا خلال المرحلة التجريبية.', 'Your trial lasts 48 hours from first use; signing up or changing plans does not restart it. Learning stays open during the pilot.')}</p>
      {error && <ErrorState what={t('حفظ اختيار الخطة', 'saving your plan choice')} onRetry={() => void save()} />}
      <Btn disabled={!selected || saving || !billing.data || billing.isError} onClick={() => void save()} data-testid="button-plan-continue">
        {saving ? t('جارٍ حفظ الاختيار…', 'Saving your choice…') : t('احفظ الاختيار وتابع إلى الدروس', 'Save choice and continue to lessons')}
      </Btn>
    </div>
  </Shell>;
}
