import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Flame, Layers, Play, Settings2, Star } from 'lucide-react';
import {
  useGetCourses, useGetProfile, useGetProgress, useGetStudyPlan, useGetVocabulary,
} from '@workspace/api-client-react';
import { Card, ErrorState, LinkBtn, PilotNote, ProgressBar, Skeleton, Am } from '@/components/bits';
import { AiAllowance } from '@/components/admin/notices';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';

function Ring({ value, label }: { value: number; label: string }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative size-36" data-testid="ring-today">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="11" className="stroke-white/15" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="11" strokeLinecap="round" className="stroke-gold transition-[stroke-dashoffset] duration-1000"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><span className="font-display text-xl font-bold">{label}</span></div>
    </div>
  );
}

export default function Dashboard() {
  const { t, lang } = useApp();
  const profile = useGetProfile();
  const progress = useGetProgress();
  const courses = useGetCourses();
  const vocab = useGetVocabulary();
  const plan = useGetStudyPlan();
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  const next = courses.data
    ?.slice().sort((a, b) => a.month - b.month)
    .flatMap((c) => c.lessons.map((l) => ({ l, c })))
    .find((x) => !x.l.completed);
  const dueCount = vocab.data?.filter((w) => w.due).length ?? 0;
  const today = plan.data?.find((d) => !d.completed);
  const goal = profile.data?.dailyGoal ?? 15;
  const mins = progress.data?.todayMinutes ?? 0;

  return (
    <Shell>
      <div className="rise mb-6">
        <p className="text-sm text-muted-foreground">{t('مرحبًا بعودتك', 'Welcome back')}</p>
        <h1 className="font-display text-3xl font-extrabold" data-testid="text-greeting">{profile.data?.displayName || t('ضيفنا العزيز', 'Dear guest')}</h1>
      </div>

      {profile.data && !profile.data.onboardingComplete && (
        <Link href="/onboarding" data-testid="banner-onboarding" className="lift rise mb-5 flex items-center gap-3 rounded-3xl border border-gold/60 bg-gold/15 p-4">
          <Settings2 className="size-5 text-primary" />
          <span className="flex-1 font-medium">{t('أخبرنا بمستواك وأهدافك ووقتك لنضبط خطتك.', 'Tell us your level, goals and time so we can tune your plan.')}</span>
          <Arrow className="size-5" />
        </Link>
      )}

      {(progress.isError || courses.isError) && <ErrorState onRetry={() => { progress.refetch(); courses.refetch(); }} />}

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <section className="rise rounded-[2rem] bg-deep p-6 text-[hsl(75_30%_96%)] sm:p-8" data-testid="card-today">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">{t('هدف اليوم', "Today's goal")}</p>
              <p className="font-display mt-1 text-2xl font-bold">{t(`${goal} دقيقة`, `${goal} minutes`)}</p>
              <p className="mt-1 text-sm text-white/70">{t('الدقائق المحتسبة هي وقت التركيز الفعلي فقط.', 'Only focused active time is counted.')}</p>
            </div>
            {progress.isLoading ? <Skeleton className="size-36 rounded-full" /> : <Ring value={mins / goal} label={`${mins}/${goal}`} />}
          </div>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            {courses.isLoading ? <Skeleton className="h-12" /> : next ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/60">{t('الدرس التالي', 'Next lesson')}</p>
                  <p className="font-display truncate font-bold">{lang === 'ar' ? next.l.titleAr : next.l.titleEn}</p>
                  <Am className="text-sm text-gold">{next.l.titleAm}</Am>
                </div>
                <LinkBtn href={`/lesson/${next.l.id}`} variant="gold" testId="button-next-lesson"><Play className="size-4" /> {t('ابدأ', 'Start')}</LinkBtn>
              </div>
            ) : <p>{t('أنهيت كل الدروس المتاحة. راجع كلماتك.', 'All available lessons are done. Review your words.')}</p>}
          </div>
        </section>

        <div className="grid gap-4">
          <Card className="rise flex items-center gap-4" style={{ animationDelay: '.08s' }}>
            <span className="grid size-12 place-items-center rounded-2xl bg-gold/25 text-[hsl(30_70%_35%)] dark:text-gold"><Flame className="size-6" /></span>
            <div>
              <p className="font-display text-2xl font-bold" data-testid="text-streak">{progress.data?.streak ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t('أيام متتالية', 'day streak')}</p>
            </div>
            <div className="ms-auto text-end">
              <p className="font-display text-2xl font-bold" data-testid="text-xp">{progress.data?.xp ?? 0}</p>
              <p className="text-sm text-muted-foreground">XP</p>
            </div>
          </Card>
          <Card className="rise" style={{ animationDelay: '.14s' }}>
            <div className="mb-2 flex items-center gap-2 font-display font-bold"><Layers className="size-5 text-primary" />{t('المراجعة', 'Review')}</div>
            {vocab.isLoading ? <Skeleton className="h-10" /> : (
              <>
                <p className="text-muted-foreground" data-testid="text-due">{dueCount > 0 ? t(`${dueCount} كلمة مستحقة للمراجعة`, `${dueCount} words due`) : t('لا كلمات مستحقة الآن.', 'No words due right now.')}</p>
                <LinkBtn href="/review" variant={dueCount ? 'primary' : 'outline'} size="sm" className="mt-3" testId="button-review">{t('افتح المراجعة', 'Open review')}</LinkBtn>
              </>
            )}
          </Card>
        </div>

        <Card className="rise" style={{ animationDelay: '.2s' }}>
          <p className="mb-1 flex items-center gap-2 font-display font-bold"><Star className="size-5 text-primary" />{t('خطة اليوم', "Today's plan")}</p>
          {plan.isLoading ? <Skeleton className="h-12" /> : today ? (
            <>
              <p className="text-sm text-muted-foreground">{t('اليوم', 'Day')} {today.day} {t('من 180', 'of 180')}</p>
              <p className="mt-1 font-semibold">{today.title}</p>
              <div className="mt-3 flex gap-2">
                {today.lessonId && <LinkBtn href={`/lesson/${today.lessonId}`} size="sm">{t('افتح الدرس', 'Open lesson')}</LinkBtn>}
                <LinkBtn href="/plan" variant="outline" size="sm">{t('الخطة كاملة', 'Full plan')}</LinkBtn>
              </div>
            </>
          ) : <p className="text-muted-foreground">{t('لا أيام متبقية.', 'No days remaining.')}</p>}
        </Card>

        <Card className="rise" style={{ animationDelay: '.26s' }}>
          <p className="mb-2 font-display font-bold">{t('الدروس المكتملة', 'Lessons completed')}</p>
          <ProgressBar value={progress.data && progress.data.totalLessons ? (progress.data.lessonsCompleted / progress.data.totalLessons) * 100 : 0} />
          <p className="mt-2 text-sm text-muted-foreground">{progress.data ? `${progress.data.lessonsCompleted} / ${progress.data.totalLessons}` : '—'}</p>
          <LinkBtn href="/fidel" variant="outline" size="sm" className="mt-3" testId="button-fidel">{t('تعلّم الفيدل', 'Learn Fidel')}</LinkBtn>
        </Card>
      </div>
      <AiAllowance />
      <PilotNote className="mt-3" />
      <PilotNote kind="audio" className="mt-3" />
    </Shell>
  );
}
