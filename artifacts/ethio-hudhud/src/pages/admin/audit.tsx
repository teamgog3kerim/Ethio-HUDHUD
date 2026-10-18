import { ScrollText } from 'lucide-react';
import { useGetAdminAudit } from '@workspace/api-client-react';
import { Card, Empty, ErrorState, Skeleton } from '@/components/bits';
import { AdminLayout } from '@/components/admin/layout';
import { useApp } from '@/lib/app';
import { fmtDate } from '@/lib/admin';

function Body() {
  const { t, lang } = useApp();
  const q = useGetAdminAudit();
  if (q.isLoading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (q.isError || !q.data) return <ErrorState what={t('السجل', 'the audit log')} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <Empty icon={<ScrollText className="size-6" />} title={t('لا توجد إجراءات بعد', 'No admin actions yet')} body={t('ستظهر هنا آخر 100 عملية إدارية.', 'The latest 100 admin actions will appear here.')} />;
  return (
    <ul className="space-y-2">
      {q.data.map((e) => (
        <li key={e.id} data-testid={`row-audit-${e.id}`}>
          <Card className="space-y-1.5 !p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold" dir="ltr">{e.action}</span>
              <time className="text-xs text-muted-foreground">{fmtDate(e.createdAt, lang)}</time>
            </div>
            <p className="text-xs text-muted-foreground" dir="ltr">{t('المنفّذ', 'Actor')}: {e.actorId} · {t('الهدف', 'Target')}: {e.targetId}</p>
            {Object.keys(e.detail).length > 0 && <pre dir="ltr" className="overflow-x-auto rounded-xl bg-muted p-2 text-xs">{JSON.stringify(e.detail, null, 2)}</pre>}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function AdminAudit() {
  const { t } = useApp();
  return <AdminLayout title={t('سجل الإدارة', 'Audit log')} sub={t('آخر 100 إجراء إداري.', 'The latest 100 administrator actions.')}><Body /></AdminLayout>;
}
