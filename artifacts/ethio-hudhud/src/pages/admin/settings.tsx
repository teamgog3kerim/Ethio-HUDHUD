import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useGetAdminSettings, useSaveAdminSettings, type AppSettings } from '@workspace/api-client-react';
import { Btn, Card, ErrorState, Skeleton } from '@/components/bits';
import { AdminLayout } from '@/components/admin/layout';
import { Field, Notice, fieldCls } from '@/components/admin/ui';
import { useApp } from '@/lib/app';
import { errMsg, invalidateAdmin } from '@/lib/admin';

function Toggle({ label, on, set, id }: { label: string; on: boolean; set: (v: boolean) => void; id: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border p-4">
      <span className="font-semibold">{label}</span>
      <input type="checkbox" className="size-5 accent-[hsl(var(--primary))]" checked={on} onChange={(e) => set(e.target.checked)} data-testid={id} />
    </label>
  );
}

function Form({ initial }: { initial: AppSettings }) {
  const { t } = useApp();
  const qc = useQueryClient();
  const [v, setV] = useState<AppSettings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = useSaveAdminSettings({
    mutation: {
      onSuccess: () => { invalidateAdmin(qc, 'settings'); setMsg({ ok: true, text: t('تم حفظ الإعدادات.', 'Settings saved.') }); },
      onError: (e) => setMsg({ ok: false, text: errMsg(e, t('تعذّر الحفظ.', 'Could not save.')) }),
    },
  });
  const set = <K extends keyof AppSettings>(k: K, val: AppSettings[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (k: 'freeAiDailyLimit' | 'complimentaryAiDailyLimit' | 'defaultDailyGoal', min: number, max: number, label: string) => (
    <Field label={label} hint={`${min} – ${max}`}>
      <input type="number" min={min} max={max} className={fieldCls} value={v[k]} onChange={(e) => set(k, Number(e.target.value))} data-testid={`input-${k}`} />
    </Field>
  );
  const submit = () => {
    setMsg(null);
    if (v.freeAiDailyLimit < 0 || v.freeAiDailyLimit > 200 || v.complimentaryAiDailyLimit < 0 || v.complimentaryAiDailyLimit > 1000 || v.defaultDailyGoal < 5 || v.defaultDailyGoal > 180) {
      setMsg({ ok: false, text: t('إحدى القيم خارج النطاق المسموح.', 'One of the values is outside its allowed range.') });
      return;
    }
    save.mutate({ data: v });
  };
  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Card className="space-y-3">
        <Toggle id="toggle-learning" label={t('التعلّم مفعّل', 'Learning enabled')} on={v.learningEnabled} set={(x) => set('learningEnabled', x)} />
        <Toggle id="toggle-ai" label={t('المعلّم الآلي مفعّل', 'AI tutor enabled')} on={v.aiEnabled} set={(x) => set('aiEnabled', x)} />
        {(!v.learningEnabled || !v.aiEnabled) && <Notice kind="info">{t('عند الحفظ سيرى المتعلمون إشعار الإيقاف المؤقت.', 'After saving, learners will see a paused notice.')}</Notice>}
      </Card>
      <Card className="grid gap-4 sm:grid-cols-3">
        {num('freeAiDailyLimit', 0, 200, t('حد الرسائل اليومي (مجاني)', 'Free daily AI limit'))}
        {num('complimentaryAiDailyLimit', 0, 1000, t('حد الوصول المجاني', 'Complimentary daily AI limit'))}
        {num('defaultDailyGoal', 5, 180, t('الهدف اليومي الافتراضي (دقيقة)', 'Default daily goal (min)'))}
      </Card>
      <Card className="space-y-4">
        <Field label={t('إعلان بالعربية', 'Announcement (Arabic)')} hint={`${v.announcementAr.length}/500`}>
          <textarea dir="rtl" rows={2} maxLength={500} className={fieldCls} value={v.announcementAr} onChange={(e) => set('announcementAr', e.target.value)} data-testid="input-announcementAr" />
        </Field>
        <Field label={t('إعلان بالإنجليزية', 'Announcement (English)')} hint={`${v.announcementEn.length}/500`}>
          <textarea dir="ltr" rows={2} maxLength={500} className={fieldCls} value={v.announcementEn} onChange={(e) => set('announcementEn', e.target.value)} data-testid="input-announcementEn" />
        </Field>
        <Field label={t('بريد الدعم', 'Support email')}>
          <input type="email" dir="ltr" maxLength={254} className={fieldCls} value={v.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} data-testid="input-supportEmail" />
        </Field>
      </Card>
      {msg && <Notice kind={msg.ok ? 'ok' : 'err'}>{msg.text}</Notice>}
      <Btn type="submit" disabled={save.isPending} data-testid="button-save-settings"><Save className="size-4" />{save.isPending ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ الإعدادات', 'Save settings')}</Btn>
    </form>
  );
}

function Body() {
  const { t } = useApp();
  const q = useGetAdminSettings();
  const seeded = useRef(false);
  const [ready, setReady] = useState<AppSettings | null>(null);
  useEffect(() => {
    if (q.data && !seeded.current) { seeded.current = true; setReady(q.data); }
  }, [q.data]);
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (q.isError) return <ErrorState what={t('الإعدادات', 'settings')} onRetry={() => void q.refetch()} />;
  if (!ready) return <Skeleton className="h-72" />;
  return <Form initial={ready} />;
}

export default function AdminSettings() {
  const { t } = useApp();
  return <AdminLayout title={t('إعدادات التطبيق', 'App settings')} sub={t('تُطبَّق فورًا على جميع المتعلمين.', 'Applied right away for all learners.')}><Body /></AdminLayout>;
}
