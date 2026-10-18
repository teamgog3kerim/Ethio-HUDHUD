import { useState } from 'react';
import { Link } from 'wouter';
import { BookOpen, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useGetCourses } from '@workspace/api-client-react';
import { Am, Card, Empty, ErrorState, PageHead, PilotNote, ProgressBar, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export default function Learn() {
  const { t, lang } = useApp();
  const q = useGetCourses();
  const [sel, setSel] = useState<string | null>(null);
  const courses = q.data?.slice().sort((a, b) => a.month - b.month);
  const cur = courses?.find((c) => c.id === sel) ?? courses?.[0];

  return (
    <Shell>
      <PageHead eyebrow={t('المقررات', 'Courses')} title={t('اختر مسارك', 'Pick your path')} sub={t('كل مقرر يضم دروسًا قصيرة بالكلمات ثم التمارين.', 'Each course has short lessons: vocabulary first, then exercises.')} />
      {q.isLoading && <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>}
      {q.isError && <ErrorState onRetry={() => q.refetch()} what={t('المقررات', 'courses')} />}
      {courses && courses.length === 0 && <Empty icon={<BookOpen />} title={t('لا مقررات بعد', 'No courses yet')} />}
      {courses && cur && (
        <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-2">
            {courses.map((c, i) => (
              <button key={c.id} type="button" onClick={() => setSel(c.id)} data-testid={`button-course-${c.id}`}
                className={cn('lift rise w-full rounded-3xl border p-4 text-start', c.id === cur.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}
                style={{ animationDelay: `${i * 50}ms` }}>
                <p className={cn('text-xs font-bold', c.id === cur.id ? 'text-gold' : 'text-primary')}>{t('الشهر', 'Month')} {c.month} · {c.level}</p>
                <p className="font-display font-bold">{lang === 'ar' ? c.titleAr : c.titleEn}</p>
                <ProgressBar className="mt-2 bg-black/10" value={c.lessons.length ? (c.completedCount / c.lessons.length) * 100 : 0} />
              </button>
            ))}
          </div>
          <Card key={cur.id} className="rise" data-testid="panel-course">
            <h2 className="font-display text-2xl font-extrabold">{lang === 'ar' ? cur.titleAr : cur.titleEn}</h2>
            <p className="mt-1 text-muted-foreground">{cur.description}</p>
            <ul className="mt-5 space-y-2">
              {cur.lessons.map((l, i) => (
                <li key={l.id}>
                  <Link href={`/lesson/${l.id}`} data-testid={`link-lesson-${l.id}`} className="lift flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
                    {l.completed ? <CheckCircle2 className="size-6 text-primary" /> : <Circle className="size-6 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{i + 1}. {lang === 'ar' ? l.titleAr : l.titleEn}</p>
                      <Am className="text-sm text-muted-foreground">{l.titleAm}</Am>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" />{l.minutes}{t(' د', 'm')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      <PilotNote className="mt-6" />
    </Shell>
  );
}
