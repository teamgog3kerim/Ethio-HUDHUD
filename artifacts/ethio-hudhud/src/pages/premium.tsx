import { Lock } from 'lucide-react';
import { useGetBillingStatus } from '@workspace/api-client-react';
import { Btn, Card, ErrorState, PageHead, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';

export default function Premium() {
  const { t } = useApp();
  const q = useGetBillingStatus();
  return (
    <Shell>
      <PageHead eyebrow="Premium" title={t('الاشتراك غير متاح بعد', 'Premium is not available yet')} sub={t('كل ميزات التعلّم الحالية مفتوحة. لا يوجد دفع ولا وصول مدفوع حاليًا.', 'All current learning features are open. There is no payment and no paid access today.')} />
      {q.isLoading && <Skeleton className="h-40" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.data && (
        <Card className="max-w-xl" data-testid="card-billing">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t('الخطة', 'Plan')}</dt><dd className="font-semibold" data-testid="text-plan">{q.data.plan}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t('إعداد Polar', 'Polar configuration')}</dt><dd className="font-semibold" data-testid="text-configured">{q.data.configured ? t('مضبوط', 'Configured') : t('غير مضبوط', 'Not configured')}</dd></div>
            {q.data.dailyAiLimit !== undefined && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t('طلبات المعلّم / 24 ساعة', 'AI requests / 24 hours')}</dt><dd>{q.data.dailyAiLimit}</dd></div>}
            {q.data.accessExpiresAt && <div className="flex flex-wrap justify-between gap-3"><dt className="text-muted-foreground">{t('انتهاء المنحة المجانية', 'Complimentary expiry')}</dt><dd>{new Date(q.data.accessExpiresAt).toLocaleString()}</dd></div>}
          </dl>
          <p className="mt-4 rounded-2xl bg-secondary p-3 text-sm" dir="auto" data-testid="text-billing-message">{q.data.message}</p>
          <Btn className="mt-4" disabled data-testid="button-subscribe"><Lock className="size-4" />{t('الاشتراك غير متاح', 'Subscription unavailable')}</Btn>
        </Card>
      )}
    </Shell>
  );
}
