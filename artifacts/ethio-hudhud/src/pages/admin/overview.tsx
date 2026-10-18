import { useGetAdminOverview } from '@workspace/api-client-react';
import { Card, ErrorState, Skeleton } from '@/components/bits';
import { AdminLayout } from '@/components/admin/layout';
import { Notice } from '@/components/admin/ui';
import { useApp } from '@/lib/app';

function Body() {
  const { t } = useApp();
  const q = useGetAdminOverview();
  if (q.isLoading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (q.isError || !q.data) return <ErrorState what={t('نظرة الإدارة', 'the overview')} onRetry={() => void q.refetch()} />;
  const o = q.data;
  const stats = [
    { k: 'registered', v: o.registeredUsers, l: t('حسابات مسجّلة', 'Registered accounts') },
    { k: 'learners', v: o.learners, l: t('متعلمون', 'Learners') },
    { k: 'lessons', v: o.completedLessons, l: t('دروس مكتملة', 'Completed lessons') },
    { k: 'ai', v: o.aiRequests, l: t('طلبات المعلّم الآلي', 'AI tutor requests') },
    { k: 'comp', v: o.activeComplimentary, l: t('وصول مجاني ساري', 'Active complimentary access') },
    { k: 'susp', v: o.suspendedUsers, l: t('حسابات موقوفة', 'Suspended accounts') },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.k} data-testid={`stat-${s.k}`}>
            <p className="text-sm text-muted-foreground">{s.l}</p>
            <p className="font-display mt-2 text-4xl font-extrabold tabular-nums">{s.v.toLocaleString()}</p>
          </Card>
        ))}
      </div>
      <Notice kind="info">
        <span data-testid="text-billing-state">
          {o.billingConfigured
            ? t('الفوترة مُهيّأة.', 'Billing is configured.')
            : t('الفوترة غير مُهيّأة: لا توجد اشتراكات مدفوعة أو معاملات فعلية. "الوصول المجاني" منحة من الإدارة وليس اشتراكًا مدفوعًا.', 'Billing is not configured: there are no paid subscriptions or real transactions. Complimentary access is an administrator grant, not a paid subscription.')}
        </span>
      </Notice>
    </div>
  );
}

export default function AdminOverview() {
  const { t } = useApp();
  return <AdminLayout title={t('نظرة عامة', 'Overview')} sub={t('أرقام فعلية من قاعدة البيانات.', 'Live counts from the database.')}><Body /></AdminLayout>;
}
