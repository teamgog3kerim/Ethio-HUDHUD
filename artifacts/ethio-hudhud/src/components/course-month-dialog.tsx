import { useCallback, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Lock } from 'lucide-react';
import { useBilling } from '@/components/billing-notice';
import { btnClass } from '@/components/bits';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/lib/app';
import { subscribeHref } from '@/lib/month-access';

export function CourseMonthDialog({ month, onClose }: { month: number | null; onClose: () => void }) {
  const { t, lang } = useApp();
  const { data: b } = useBilling();
  const returnFocus = useRef<HTMLElement | null>(null);
  const pending = b?.paymentVerificationPending === true || !!b?.pendingCheckoutPlan;
  const scheduled = b?.scheduledCourseMonths?.find(item => item.month === month);
  const next = b?.monthlyNextPurchaseAt;
  const openingDate = scheduled ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' }).format(new Date(scheduled.startsAt)) : null;
  const nextDate = next && !Number.isNaN(new Date(next).getTime())
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium' }).format(new Date(next)) : null;
  const label = month && month > 0 ? `${t('الشهر', 'Month')} ${month}` : t('هذا الشهر', 'This month');
  return (
    <Dialog open={month !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-md rounded-3xl"
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = returnFocus.current?.isConnected ? returnFocus.current : document.getElementById('main-content');
          target?.focus({ preventScroll: true });
        }}
      >
        <span className="grid size-12 place-items-center rounded-full bg-gold text-gold-foreground"><Lock className="size-5" /></span>
        <DialogTitle className="font-display text-xl font-extrabold">{label} {t('مقفل حاليًا', 'is locked for now')}</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
            {openingDate ? (
              <p data-testid="text-month-scheduled">{t(`هذا الشهر مدفوع بالفعل، وسيُفتح عند بدء فترته في ${openingDate}. لا تدفع ثمنه مرة أخرى. يمكنك متابعة الأشهر المتاحة الآن.`, `This month is already paid for and opens when its period starts on ${openingDate}. Do not pay for it again. You can continue your available months now.`)}</p>
            ) : pending ? (
              <p data-testid="text-month-pending">{t('نتحقق من دفعة موجودة. لا تدفع مرة أخرى حتى يكتمل التحقق؛ ستتحدّث الأشهر المتاحة بحسب الخطة المؤكدة.', 'We are checking an existing payment. Do not pay again until verification is complete; available months will update according to the confirmed plan.')}</p>
            ) : (<>
              <p>{t('تفتح الدفعات الشهرية أشهر الدورة بالترتيب، ولا يمكن تخطي الأشهر 1–5 للوصول إلى الشهر 6 إلا بخطة الستة أشهر الكاملة. تقدّمك محفوظ ولا يُخصم شيء بفتح هذه النافذة.', 'Monthly payments unlock course months in order; you cannot skip months 1–5 to reach month 6 unless you have the full six-month plan. Your progress is kept and nothing is charged by opening this.')}</p>
              {nextDate && <p data-testid="text-month-next-purchase">{t(`يمكنك شراء الشهر التالي ابتداءً من ${nextDate}. التفاصيل في صفحة الخطط.`, `You can buy the next month from ${nextDate}. See the plans page for details.`)}</p>}
            </>)}
          </div>
        </DialogDescription>
        <div className="flex flex-col gap-2">
          <Link href={scheduled ? '/plan' : subscribeHref(pending)} onClick={onClose} data-testid="link-month-subscribe" className={btnClass('gold', 'lg')}>
            {scheduled ? t('متابعة خطة التعلّم', 'Continue learning plan') : pending ? t('عرض حالة الدفع', 'View payment status') : t('عرض خيارات الاشتراك', 'See subscription options')}
          </Link>
          <button type="button" onClick={onClose} data-testid="button-month-cancel" className={btnClass('outline', 'md')}>{t('إلغاء، تابع الدروس المتاحة', 'Cancel, continue available lessons')}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useMonthLock() {
  const [month, setMonth] = useState<number | null>(null);
  const close = useCallback(() => setMonth(null), []);
  return { open: (m: number) => setMonth(m), dialog: <CourseMonthDialog month={month} onClose={close} /> };
}
