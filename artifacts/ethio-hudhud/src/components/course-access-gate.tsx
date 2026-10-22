import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useBilling } from './billing-notice';
import { Shell } from './shell';
import { ErrorState, LinkBtn, PageHead, Skeleton } from './bits';
import { CoursePlans } from './course-plans';
import { useApp } from '@/lib/app';

export function CourseAccessGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const billing = useBilling();
  const cache = useQueryClient();
  const { t } = useApp();
  const b = billing.data;
  const protectedPage = /^\/(?:dashboard|learn|lesson(?:\/.*)?|fidel|plan|review|tutor)\/?$/.test(location);

  useEffect(() => {
    if (!b?.enforcementEnabled || b.trial.state !== 'active') return;
    // Re-check at the actual expiry, including while a lesson stays open.
    const delay = Math.max(0, new Date(b.trial.endsAt).getTime() - Date.now());
    const timer = window.setTimeout(() => {
      void billing.refetch();
    }, delay + 50);
    return () => window.clearTimeout(timer);
  }, [b?.enforcementEnabled, b?.trial.endsAt, b?.trial.state, cache, billing.refetch]);

  useEffect(() => {
    if (!b?.enforcementEnabled || b.fullCourseAccess) return;
    // Discard learning payloads only; preserve account and billing queries.
    cache.removeQueries({ predicate: q => {
      const key = q.queryKey[0];
      return typeof key === 'string' && /^\/api\/(?:courses|lessons|study-plan|vocabulary|favourites|ai\/chat)(?:\/|$)/.test(key);
    } });
  }, [b?.enforcementEnabled, b?.fullCourseAccess, cache]);

  if (!protectedPage) return children;
  if (billing.isLoading) return <Shell><Skeleton className="h-64" /></Shell>;
  if (billing.isError || !b) return <Shell><ErrorState what={t('التحقق من صلاحية التعلّم', 'checking learning access')} onRetry={() => void billing.refetch()} /></Shell>;
  if (!b.enforcementEnabled || b.fullCourseAccess) return children;
  return <Shell>
    <div data-testid="course-subscription-required">
      <PageHead title={t('انتهت تجربتك المجانية', 'Your free trial has ended')} sub={t('أكملت 48 ساعة من التجربة. اختر اشتراكاً شهرياً أو اشتراك ستة أشهر لمتابعة الدروس والمحادثات. تقدمك محفوظ.', 'Your 48-hour trial is complete. Choose monthly or six-month access to continue lessons and conversations. Your progress is saved.')} />
      {b.isGuest && <LinkBtn href="/sign-up" className="mb-6">{t('إنشاء حساب للاشتراك', 'Create an account to subscribe')}</LinkBtn>}
      <CoursePlans paidOnly />
      <LinkBtn href="/account" variant="outline" className="mt-6">{t('حسابي', 'My account')}</LinkBtn>
    </div>
  </Shell>;
}
