import { useState } from 'react';
import { Link } from 'wouter';
import { BookOpen, CheckCircle2, Circle, Clock, MessageCircle } from 'lucide-react';
import { useGetCourses } from '@workspace/api-client-react';
import { Am, Card, Empty, ErrorState, PageHead, PilotNote, ProgressBar, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export default function Learn() {
  const { t, lang } = useApp();
  const q = useGetCourses();
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<'courses' | 'conversations'>(() =>
    new URLSearchParams(window.location.search).get('view') === 'conversations' ? 'conversations' : 'courses');
  const courses = q.data?.slice().sort((a, b) => a.month - b.month);
  const conversations = courses?.flatMap(c => c.lessons.filter(l => l.dialogue?.length).map(l => ({ ...l, courseTitle: lang === 'ar' ? c.titleAr : c.titleEn })));
  const cur = courses?.find((c) => c.id === sel) ?? courses?.[0];

  return (
    <Shell>
      <PageHead eyebrow={t('المقررات', 'Courses')} title={t('اختر مسارك', 'Pick your path')} sub={t('دروس قصيرة ومحادثات يومية، مع النطق بالعربية وتمارين الفهم.', 'Short lessons and everyday conversations, with Arabic-script pronunciation and comprehension exercises.')} />
      {courses && <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={t('نوع التعلّم', 'Learning view')}>
        {(['courses', 'conversations'] as const).map(v => <button key={v} type="button" aria-pressed={view === v}
          data-testid={`button-view-${v}`} onClick={() => setView(v)}
          className={cn('press rounded-full border px-5 py-2 text-sm font-semibold', view === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
          {v === 'courses' ? t('الدروس', 'Lessons') : `${t('المحادثات', 'Conversations')} (${conversations?.length ?? 0})`}
        </button>)}
      </div>}
      {q.isLoading && <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>}
      {q.isError && <ErrorState onRetry={() => q.refetch()} what={t('المقررات', 'courses')} />}
      {courses && courses.length === 0 && <Empty icon={<BookOpen />} title={t('لا مقررات بعد', 'No courses yet')} />}
      {view === 'conversations' && conversations && (
        conversations.length ? <div className="grid gap-4 sm:grid-cols-2">
          {conversations.map(l => <Link key={l.id} href={`/lesson/${l.id}`} data-testid={`conversation-link-${l.id}`}
            className="lift rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-primary"><MessageCircle className="size-6" />{l.completed && <CheckCircle2 className="size-5" />}</div>
            <p className="text-xs text-muted-foreground">{l.courseTitle}</p>
            <h2 className="font-display mt-1 text-xl font-bold">{lang === 'ar' ? l.titleAr : l.titleEn}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{l.dialogue!.length} {t('جمل متبادلة', 'dialogue turns')} · {l.minutes}{t(' دقائق', ' min')}</p>
            <span className="mt-4 block text-sm font-bold text-primary">{t('اقرأ وتدرّب', 'Read and practise')}</span>
          </Link>)}
        </div> : <Empty icon={<MessageCircle />} title={t('لا محادثات متاحة بعد', 'No conversations available yet')} />
      )}
      {view === 'courses' && courses && cur && (
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
                      {!!l.dialogue?.length && <span className="text-xs font-semibold text-primary">{t('محادثة', 'Conversation')}</span>}
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
