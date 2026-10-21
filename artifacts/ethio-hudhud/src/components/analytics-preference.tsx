import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app';
import { getAnalyticsPrivacy, setAnalyticsEnabled } from '@/lib/analytics';

export function AnalyticsPreference() {
  const { t } = useApp();
  const [state, setState] = useState(getAnalyticsPrivacy);
  const [error, setError] = useState(false);
  useEffect(() => {
    const refresh = () => setState(getAnalyticsPrivacy());
    window.addEventListener('hudhud:analytics-change', refresh);
    refresh();
    return () => window.removeEventListener('hudhud:analytics-change', refresh);
  }, []);
  const locked = state.reason === 'browser' || state.reason === 'tracker' || state.reason === 'storage';

  return (
    <section className="my-6 space-y-3 rounded-2xl border border-border p-5" aria-labelledby="analytics-heading">
      <h2 id="analytics-heading" className="font-display text-lg font-bold">{t('تحليلات الاستخدام الاختيارية', 'Optional usage analytics')}</h2>
      <p id="analytics-description" className="text-sm leading-relaxed text-muted-foreground">
        {t('السماح بقياس زيارات الصفحات وتفاعلات التثبيت لتحسين الموقع، دون إرسال معرّفات المتعلمين أو نصوص المحادثات. يُحفظ الاختيار في هذا المتصفح فقط ويُطبّق فورًا دون حفظ إعدادات الحساب.', 'Allow pageview and installation interaction measurements to improve the website, without sending learner identifiers or chat content. This choice is saved only in this browser and applies immediately, without saving account settings.')}
      </p>
      <label className="flex items-center justify-between gap-4 text-sm font-semibold">
        {t('السماح بالتحليلات الاختيارية', 'Allow optional analytics')}
        <input type="checkbox" className="size-5 accent-[hsl(var(--primary))]"
          checked={state.enabled} disabled={locked} aria-describedby="analytics-description analytics-status"
          data-testid="switch-analytics" onChange={e => {
            const enabled = e.target.checked;
            const saved = setAnalyticsEnabled(enabled);
            setError(!saved);
            setState(getAnalyticsPrivacy());
            // A tracker skipped at startup may not have initialized automatic pageviews.
            if (saved && enabled && getAnalyticsPrivacy().enabled) window.location.reload();
          }} />
      </label>
      <p id="analytics-status" role="status" className="text-sm text-muted-foreground">
        {error || state.reason === 'storage'
          ? t('تعذّر الوصول إلى تخزين المتصفح أو حفظ الاختيار. التحليلات الاختيارية متوقفة؛ تحقق من إعدادات المتصفح.', 'Browser storage is unavailable or the choice could not be saved. Optional analytics is off; check browser settings.')
          : state.reason === 'browser'
            ? t('متوقفة احترامًا لإشارة عدم التتبع أو التحكم العالمي بالخصوصية في متصفحك.', 'Off to respect your browser’s Do Not Track or Global Privacy Control signal.')
            : state.reason === 'tracker'
              ? t('متوقفة بسبب إعداد منع تتبع موجود في متصفحك. لن نلغي هذا الإعداد.', 'Off because an existing tracker opt-out is set in your browser. We will not override it.')
              : state.enabled
                ? t('مسموح بها عند توفر خدمة التحليلات. إعادة التفعيل تُحدّث الصفحة؛ لا نعيد إرسال أحداث سابقة.', 'Allowed when analytics is available. Re-enabling reloads the page; past events are not replayed.')
                : t('متوقفة. لن تُرسل زيارات صفحات أو أحداث اختيارية جديدة.', 'Off. No new optional pageviews or events will be sent.')}
      </p>
      <p className="text-xs text-muted-foreground">{t('لا يؤثر ذلك على التعلّم أو تسجيل الدخول أو عدّادات التشغيل الضرورية أو سجلات الاستضافة، ولا يحذف بيانات أُرسلت سابقًا.', 'This does not affect learning, sign-in, necessary operational counters, or hosting logs, and does not delete data already sent.')}</p>
    </section>
  );
}
