import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetProfileQueryKey, useGetProfile, useSaveProfile, type ProfileInput } from '@workspace/api-client-react';
import { Btn, Card, ErrorState, PageHead, ProgressBar, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { GOALS, MINUTE_CHOICES } from '@/lib/options';
import { cn } from '@/lib/utils';

const levels: { id: ProfileInput['level']; ar: string; en: string }[] = [
  { id: 'beginner', ar: 'مبتدئ', en: 'Beginner' },
  { id: 'intermediate', ar: 'متوسط', en: 'Intermediate' },
  { id: 'advanced', ar: 'متقدّم', en: 'Advanced' },
];

export default function Onboarding() {
  const { t, lang, setLang } = useApp();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const q = useGetProfile();
  const [step, setStep] = useState(() => { try { return Math.min(4, Number(localStorage.getItem('hh-onb-step')) || 0); } catch { return 0; } });
  const [pc, setPc] = useState<(number | undefined)[]>([]);
  const [f, setF] = useState<ProfileInput | null>(null);
  const save = useSaveProfile({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProfileQueryKey() }); },
    },
  });
  useEffect(() => {
    if (q.data && !f) {
      const { id: _i, isGuest: _g, joinedAt: _j, ...rest } = q.data;
      setF({ ...rest, timezone: rest.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, language: lang });
    }
  }, [q.data, f, lang]);
  const set = (p: Partial<ProfileInput>) => setF((x) => (x ? { ...x, ...p } : x));
  const steps = 5;
  const PLACE = [
    { p: ['ما معنى ሰላም؟', 'What does ሰላም mean?'], o: [['مرحبًا / سلام', 'Hello / peace'], ['شكرًا', 'Thank you'], ['وداعًا', 'Goodbye']], c: 0, e: ['ሰላም تحية شائعة تعني السلام والمرحبًا.', 'ሰላም is a common greeting meaning peace or hello.'] },
    { p: ['كيف يُنطق الحرف ለ تقريبًا؟', 'Roughly how is the letter ለ read?'], o: [['lä', 'lä'], ['mä', 'mä'], ['sä', 'sä']], c: 0, e: ['ለ هو الشكل الأول لعائلة حرف اللام.', 'ለ is the first form of the l family.'] },
    { p: ['ما معنى አመሰግናለሁ؟', 'What does አመሰግናለሁ mean?'], o: [['شكرًا', 'Thank you'], ['من فضلك', 'Please'], ['آسف', 'Sorry']], c: 0, e: ['አመሰግናለሁ تعني: أشكرك.', 'አመሰግናለሁ means: I thank you.'] },
  ];
  const score = PLACE.filter((x, i) => pc[i] === x.c).length;
  const placed = pc.length >= 3 && pc.every((x) => x !== undefined);
  const persist = () => {
    if (!f) return;
    save.mutate({ data: { ...f, displayName: f.displayName.trim() || f.displayName, onboardingComplete: q.data?.onboardingComplete ?? false } });
  };
  const goNext = () => {
    persist();
    const n = step + 1;
    setStep(n);
    try { localStorage.setItem('hh-onb-step', String(n)); } catch { /* ignore */ }
  };
  const input = 'h-12 w-full rounded-2xl border border-input bg-background px-4 outline-none focus:border-primary';

  return (
    <Shell>
      <PageHead eyebrow={`${step + 1} / ${steps}`} title={t('لنضبط رحلتك', "Let's shape your journey")} />
      {q.isLoading && <Skeleton className="h-80" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {f && (
        <Card className="mx-auto max-w-xl">
          <ProgressBar value={((step + 1) / steps) * 100} className="mb-6" />
          <div key={step} className="rise space-y-4">
            {step === 0 && (
              <>
                <label className="block font-semibold">{t('ماذا نناديك؟', 'What should we call you?')}
                  <input className={cn(input, 'mt-2')} value={f.displayName} maxLength={80} onChange={(e) => set({ displayName: e.target.value })} data-testid="input-name" />
                </label>
                <p className="font-semibold">{t('مستواك في الأمهرية', 'Your Amharic level')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {levels.map((l) => (
                    <button key={l.id} type="button" onClick={() => set({ level: l.id })} data-testid={`button-level-${l.id}`} className={cn('press rounded-2xl border-2 py-3 font-semibold', f.level === l.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{lang === 'ar' ? l.ar : l.en}</button>
                  ))}
                </div>
                <p className="font-semibold">{t('لغة الواجهة', 'Interface language')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['ar', 'en'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => { set({ language: l }); setLang(l); }} data-testid={`button-language-${l}`} className={cn('press rounded-2xl border-2 py-3 font-semibold', f.language === l ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{l === 'ar' ? 'العربية' : 'English'}</button>
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p className="font-semibold">{t('أهدافك (حتى 7)', 'Your goals (up to 7)')}</p>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => {
                    const on = f.goals.includes(g.id);
                    return <button key={g.id} type="button" data-testid={`button-goal-${g.id}`} onClick={() => set({ goals: on ? f.goals.filter((x) => x !== g.id) : [...f.goals, g.id] })} className={cn('press rounded-full border-2 px-4 py-2', on ? 'border-gold bg-gold text-gold-foreground' : 'border-border')}>{lang === 'ar' ? g.ar : g.en}</button>;
                  })}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="font-semibold">{t('دقائق يوميًا', 'Minutes per day')}</p>
                <div className="flex flex-wrap gap-2">
                  {MINUTE_CHOICES.map((m) => <button key={m} type="button" data-testid={`button-minutes-${m}`} onClick={() => set({ dailyGoal: m })} className={cn('press rounded-2xl border-2 px-5 py-3 font-semibold', f.dailyGoal === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{m}</button>)}
                </div>
                <label className="block text-sm">{t('أو رقم مخصص (5–180)', 'Or a custom number (5–180)')}
                  <input type="number" min={5} max={180} className={cn(input, 'mt-2')} value={f.dailyGoal} onChange={(e) => set({ dailyGoal: Math.min(180, Math.max(5, Number(e.target.value) || 5)) })} data-testid="input-minutes" />
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <p className="font-semibold">{t('اختبار قصير من 3 أسئلة', 'A short 3-question check')}</p>
                <p className="text-sm text-muted-foreground">{t('أمثلة ابتدائية فقط من الفيدل والتحيات. لا يقيس الطلاقة.', 'Only initial Fidel and greeting examples. It does not measure fluency.')}</p>
                {PLACE.map((x, i) => (
                  <div key={i} className="rounded-2xl border border-border p-3" data-testid={`placement-${i}`}>
                    <p className="mb-2 font-semibold" dir="auto">{i + 1}. {t(x.p[0], x.p[1])}</p>
                    <div className="flex flex-wrap gap-2">
                      {x.o.map((o, j) => (
                        <button key={j} type="button" disabled={pc[i] !== undefined} onClick={() => setPc((a) => { const n = [...a]; n[i] = j; return n; })} data-testid={`placement-${i}-option-${j}`}
                          className={cn('press rounded-xl border-2 px-4 py-2', pc[i] === j ? (j === x.c ? 'pop border-primary bg-primary text-primary-foreground' : 'shake border-destructive') : 'border-border')} dir="auto">
                          {t(o[0], o[1])}
                        </button>
                      ))}
                    </div>
                    {pc[i] !== undefined && (
                      <p className="rise mt-2 text-sm" data-testid={`placement-feedback-${i}`}>
                        {pc[i] === x.c ? t('إجابة صحيحة. ', 'Correct. ') : t('ليست الإجابة الصحيحة. ', 'Not quite. ')}{t(x.e[0], x.e[1])}
                      </p>
                    )}
                  </div>
                ))}
                {placed && (
                  <div className="rise rounded-2xl bg-gold/15 p-4 text-sm" data-testid="placement-result">
                    <p className="font-semibold">{t(`النتيجة: ${score} من 3`, `Result: ${score} of 3`)}</p>
                    <p className="mt-1">{t('توصيتنا الحذرة: ابدأ كمبتدئ من الفيدل والتحيات. ثلاثة أسئلة لا تكفي لإثبات مستوى أعلى، ويمكنك تغيير المستوى لاحقًا.', 'Our cautious recommendation: start as a beginner with Fidel and greetings. Three questions cannot prove a higher level, and you can change it later.')}</p>
                    {f.level !== 'beginner' && <Btn size="sm" variant="outline" className="mt-2" onClick={() => set({ level: 'beginner' })} data-testid="button-apply-beginner">{t('اعتمد مبتدئ', 'Use beginner')}</Btn>}
                  </div>
                )}
              </>
            )}
            {step === 4 && (
              <>
                <label className="block font-semibold">{t('المنطقة الزمنية', 'Timezone')}
                  <input className={cn(input, 'mt-2')} dir="ltr" value={f.timezone} onChange={(e) => set({ timezone: e.target.value })} data-testid="input-timezone" />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-border p-4 font-semibold">{t('تذكير يومي', 'Daily reminder')}
                  <input type="checkbox" className="size-6 accent-[hsl(var(--primary))]" checked={f.reminderEnabled} onChange={(e) => set({ reminderEnabled: e.target.checked })} data-testid="switch-reminder" />
                </label>
                {f.reminderEnabled && <input type="time" className={input} value={f.reminderTime} onChange={(e) => set({ reminderTime: e.target.value })} data-testid="input-reminder-time" dir="ltr" />}
                <p className="text-xs text-muted-foreground">{t('الإعداد يُحفظ فقط؛ لا نعد بإرسال إشعارات حتى يتوفر ذلك.', 'The setting is saved only; no notifications are promised until delivery exists.')}</p>
              </>
            )}
          </div>
          {save.isError && <p className="mt-3 text-sm text-destructive">{t('تعذّر الحفظ، حاول مجددًا.', 'Could not save, try again.')}</p>}
          <div className="mt-8 flex justify-between">
            <Btn variant="ghost" disabled={step === 0} onClick={() => { const n = step - 1; setStep(n); try { localStorage.setItem('hh-onb-step', String(n)); } catch { /* ignore */ } }} data-testid="button-back">{t('رجوع', 'Back')}</Btn>
            {step < steps - 1 ? <Btn onClick={goNext} data-testid="button-continue">{t('متابعة', 'Continue')}</Btn>
              : <Btn variant="gold" disabled={save.isPending || !f.displayName.trim()} onClick={() => save.mutate({ data: { ...f, displayName: f.displayName.trim(), onboardingComplete: true } }, { onSuccess: () => { try { localStorage.removeItem('hh-onb-step'); } catch { /* ignore */ } nav('/dashboard'); } })} data-testid="button-finish">{save.isPending ? t('جارٍ الحفظ...', 'Saving...') : t('احفظ وابدأ', 'Save and begin')}</Btn>}
          </div>
        </Card>
      )}
    </Shell>
  );
}
