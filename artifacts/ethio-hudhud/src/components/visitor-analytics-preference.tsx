import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app';
import { getAnalyticsPrivacy } from '@/lib/analytics';
import { hasPrivacySignal, readVisitorConsent, setVisitorConsent, type VisitorConsent } from '@/lib/visitor-analytics';

export function VisitorAnalyticsPreference() {
  const { t } = useApp();
  const [consent, setConsent] = useState<VisitorConsent>(readVisitorConsent);
  const [saveError, setSaveError] = useState(false);
  const [privacyEnabled, setPrivacyEnabled] = useState(getAnalyticsPrivacy().enabled);
  useEffect(() => {
    const refresh = () => {
      setConsent(readVisitorConsent());
      setPrivacyEnabled(getAnalyticsPrivacy().enabled);
    };
    window.addEventListener('hudhud:visitor-analytics-change', refresh);
    window.addEventListener('hudhud:analytics-change', refresh);
    refresh();
    return () => {
      window.removeEventListener('hudhud:visitor-analytics-change', refresh);
      window.removeEventListener('hudhud:analytics-change', refresh);
    };
  }, []);
  const blocked = consent === 'unavailable' || hasPrivacySignal();

  return (
    <section className="my-5 space-y-3 rounded-2xl border border-border bg-card p-5" aria-labelledby="visitor-analytics-heading" data-testid="section-visitor-analytics">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('اختيار مستقل', 'Separate choice')}</p>
          <h2 id="visitor-analytics-heading" className="font-display text-lg font-bold">{t('تحليلات لوحة الزوار', 'Visitor dashboard analytics')}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${consent === 'on' && privacyEnabled && !hasPrivacySignal() ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {consent === 'on' && privacyEnabled && !hasPrivacySignal() ? t('مفعّلة', 'On') : t('متوقفة', 'Off')}
        </span>
      </div>
      <p id="visitor-analytics-description" className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t('هذه الموافقة منفصلة عن تحليلات Replit/Umami الاختيارية أعلاه، ومتوقفة افتراضيًا. عند تفعيلها فقط، نرسل معرّف متصفح مجهولًا دوّارًا لمدة 30 يومًا، ومعرّف زيارة جديدًا ومسارًا عامًا ولغة التطبيق. لا نرسل معرّف الحساب أو البريد أو الاسم أو نصوصًا حرة أو موقع البلد من المتصفح. تُحفظ هذه البيانات 90 يومًا؛ والعدادات تقريبية.', 'This is separate from the optional Replit/Umami analytics above and is off by default. Only after opting in, we send a rotating anonymous browser ID for 30 days, a fresh pageview ID, a broad page path and app language. We never send account IDs, email, names, free text, or browser-supplied country. Data is retained for 90 days; counts are approximate.')}
      </p>
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 text-sm font-semibold">
        <span>{t('السماح بقياس الزيارات المجهولة', 'Allow anonymous visitor measurement')}</span>
        <input
          type="checkbox"
          className="size-5 accent-[hsl(var(--primary))]"
          checked={consent === 'on'}
          disabled={blocked}
          aria-describedby="visitor-analytics-description visitor-analytics-status"
          data-testid="switch-visitor-analytics"
          onChange={(event) => {
            const enabled = event.target.checked;
            const saved = setVisitorConsent(enabled);
            setSaveError(!saved);
            setConsent(readVisitorConsent());
          }}
        />
      </label>
      <p id="visitor-analytics-status" role="status" className="text-sm text-muted-foreground">
        {saveError || consent === 'unavailable'
          ? t('تخزين المتصفح غير متاح؛ لذلك تبقى هذه التحليلات متوقفة.', 'Browser storage is unavailable, so these analytics remain off.')
          : hasPrivacySignal()
            ? t('متوقفة احترامًا لإشارة عدم التتبع أو التحكم العالمي بالخصوصية.', 'Off to respect Do Not Track or Global Privacy Control.')
            : !privacyEnabled
              ? t('لن تُرسل بيانات لوحة الزوار إلا إذا فُعّل هذا الاختيار وتوفرت موافقة التحليلات العامة في المتصفح.', 'Visitor data is sent only when this choice is on and the app-wide analytics privacy check also allows it.')
              : consent === 'on'
                ? t('مفعّلة لهذا المتصفح فقط. يمكنك إيقافها في أي وقت؛ عند الإيقاف يُحذف المعرّف المحلي.', 'On for this browser only. Turn it off any time; opting out clears the local visitor ID.')
                : t('متوقفة افتراضيًا. لا تُرسل زيارات الصفحات حتى تختار تفعيلها.', 'Off by default. Pageviews are not sent unless you explicitly turn this on.')}
      </p>
    </section>
  );
}
