import { Megaphone, PauseCircle } from 'lucide-react';
import { useGetBillingStatus, useGetPublicSettings } from '@workspace/api-client-react';
import { useApp } from '@/lib/app';

export function PlatformNotices() {
  const { t, lang } = useApp();
  const { data: s } = useGetPublicSettings();
  if (!s) return null;
  const text = (lang === 'ar' ? s.announcementAr || s.announcementEn : s.announcementEn || s.announcementAr).trim();
  const row = 'flex items-start gap-3 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm';
  return (
    <div className="mb-4 space-y-2" data-testid="platform-notices">
      {text && <p className={row} data-testid="text-announcement"><Megaphone className="mt-0.5 size-4 shrink-0" />{text}</p>}
      {!s.learningEnabled && <p className={row} data-testid="text-learning-paused"><PauseCircle className="mt-0.5 size-4 shrink-0" />{t('التعلّم متوقف مؤقتًا من قبل الإدارة. ستعود الدروس قريبًا.', 'Learning is temporarily paused by the administrators. Lessons will return soon.')}</p>}
      {!s.aiEnabled && <p className={row} data-testid="text-ai-paused"><PauseCircle className="mt-0.5 size-4 shrink-0" />{t('المعلّم الآلي متوقف مؤقتًا.', 'The AI tutor is temporarily paused.')}</p>}
    </div>
  );
}

export function AiAllowance() {
  const { t } = useApp();
  const billing = useGetBillingStatus();
  const { data: s } = useGetPublicSettings();
  const n = billing.data?.dailyAiLimit ?? s?.freeAiDailyLimit;
  if (n === undefined) return null;
  return (
    <p className="mt-6 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm" data-testid="text-ai-allowance">
      {t(`حدّ المعلّم الآلي الحالي ${n} رسالة خلال أي 24 ساعة متحركة، وقد تُحتسب محاولات الطلب أيضًا.`, `Your current AI tutor limit is ${n} messages per rolling 24 hours; request attempts may also count.`)}
    </p>
  );
}
