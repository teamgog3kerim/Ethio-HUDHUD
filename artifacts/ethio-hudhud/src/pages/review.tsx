import { useEffect, useRef, useState } from 'react';
import { PronunciationNote } from '@/components/pronunciation-note';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Layers, RotateCcw } from 'lucide-react';
import {
  getGetProgressQueryKey, getGetVocabularyQueryKey, useGetVocabulary, useReviewVocabulary,
} from '@workspace/api-client-react';
import { Am, Btn, Card, Empty, ErrorState, LinkBtn, PageHead, PilotNote, ProgressBar, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';

export default function Review() {
  const { t } = useApp();
  const qc = useQueryClient();
  const q = useGetVocabulary();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const init = useRef(false);

  useEffect(() => {
    if (q.data && !init.current) {
      init.current = true;
      setQueue(q.data.filter((w) => w.due).map((w) => w.id));
    }
  }, [q.data]);

  const rv = useReviewVocabulary({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetVocabularyQueryKey() });
        qc.invalidateQueries({ queryKey: getGetProgressQueryKey() });
      },
    },
  });

  const word = queue && q.data ? q.data.find((w) => w.id === queue[pos]) : undefined;
  const finished = queue !== null && pos >= queue.length;

  const answer = (ok: boolean) => {
    if (!word) return;
    rv.mutate({ id: word.id, data: { remembered: ok } }, {
      onSuccess: () => { if (ok) setRemembered((r) => r + 1); setFlipped(false); setPos((p) => p + 1); },
    });
  };

  const restart = () => {
    init.current = false; setPos(0); setRemembered(0); setFlipped(false); setQueue(null); q.refetch();
  };

  return (
    <Shell>
      <PageHead eyebrow={t('تكرار متباعد', 'Spaced repetition')} title={t('مراجعة الكلمات', 'Review words')}
        sub={t('اقلب البطاقة، ثم قل بصدق: تذكّرتها أم لا. الخادم يحدد موعدها القادم.', 'Flip the card, then say honestly: remembered or not. The server schedules the next time.')} />
      {q.isLoading && <Skeleton className="h-96" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} what={t('الكلمات', 'words')} />}
      {q.data && q.data.length === 0 && (
        <Empty icon={<Layers />} title={t('لا كلمات بعد', 'No words yet')} body={t('أكمل درسًا لتظهر كلماته هنا.', 'Complete a lesson and its words appear here.')} action={<LinkBtn href="/learn" size="sm">{t('اذهب إلى الدروس', 'Go to lessons')}</LinkBtn>} />
      )}
      {queue && q.data && q.data.length > 0 && queue.length === 0 && (
        <Empty icon={<Check />} title={t('لا شيء مستحق الآن', 'Nothing due right now')} body={t('عد لاحقًا أو تعلّم كلمات جديدة.', 'Come back later or learn new words.')} action={<LinkBtn href="/learn" size="sm">{t('الدروس', 'Lessons')}</LinkBtn>} />
      )}
      {queue && queue.length > 0 && !finished && word && (
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground"><ProgressBar className="flex-1" value={(pos / queue.length) * 100} />{pos + 1}/{queue.length}</div>
          <div className="flip-scene">
            <div className={`flip-card relative h-80 ${flipped ? 'on' : ''}`} data-testid="card-flash">
              <button type="button" onClick={() => setFlipped(true)} data-testid="button-flip" disabled={flipped}
                className="flip-face absolute inset-0 grid place-items-center rounded-[2rem] border border-border bg-card shadow-lg">
                <span className="text-center">
                  <Am className="block text-7xl font-bold text-primary">{word.amharic}</Am>
                  <span className="mt-3 block text-lg leading-loose text-muted-foreground" dir="rtl" lang="ar">{word.transliteration}</span>
                  <PronunciationNote />
                  <span className="mt-6 block text-xs text-muted-foreground">{t('اضغط لإظهار المعنى', 'Tap to reveal meaning')}</span>
                </span>
              </button>
              <div className="flip-face flip-back absolute inset-0 grid place-items-center rounded-[2rem] bg-deep p-6 text-center text-[hsl(75_30%_96%)]">
                <div>
                  <p className="font-display text-4xl font-extrabold text-gold">{word.arabic}</p>
                  <p className="mt-2 text-xl" dir="ltr">{word.english}</p>
                  <Am className="mt-4 block text-2xl">{word.amharic}</Am>
                  <p className="mt-2 text-xs text-white/60">{t('الفاصل الحالي', 'Current interval')}: {word.interval}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Btn variant="outline" size="lg" disabled={!flipped || rv.isPending} onClick={() => answer(false)} data-testid="button-forgot"><RotateCcw className="size-5" />{t('لم أتذكر', 'Again')}</Btn>
            <Btn size="lg" disabled={!flipped || rv.isPending} onClick={() => answer(true)} data-testid="button-remembered"><Check className="size-5" />{t('تذكّرت', 'Remembered')}</Btn>
          </div>
          {rv.isError && <p className="mt-3 text-center text-sm text-destructive">{t('تعذّر حفظ إجابتك. حاول مرة أخرى.', 'Could not save your answer. Try again.')}</p>}
        </div>
      )}
      {finished && queue && queue.length > 0 && (
        <Card className="pop mx-auto max-w-md text-center" data-testid="panel-review-done">
          <p className="font-display text-2xl font-extrabold">{t('انتهت الجلسة', 'Session complete')}</p>
          <p className="mt-2 text-muted-foreground">{t(`تذكّرت ${remembered} من ${queue.length}`, `Remembered ${remembered} of ${queue.length}`)}</p>
          <Btn className="mt-4" onClick={restart} data-testid="button-restart-review">{t('تحقق من مستحق جديد', 'Check for more due')}</Btn>
        </Card>
      )}
      {q.data && q.data.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-lg font-bold">{t('كل كلماتك', 'All your words')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.data.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3" data-testid={`row-word-${w.id}`}>
                <Am className="text-xl font-semibold">{w.amharic}</Am>
                <span className="text-sm text-muted-foreground">{w.arabic}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${w.due ? 'bg-gold/30' : 'bg-secondary'}`}>{w.due ? t('مستحق', 'due') : `${w.interval}d`}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <PilotNote className="mt-6" />
    </Shell>
  );
}
