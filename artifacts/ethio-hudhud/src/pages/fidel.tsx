import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useGetCourses, type Word } from '@workspace/api-client-react';
import { Am, Card, Empty, ErrorState, PageHead, PilotNote, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { FIDEL_FAMILIES, fidelForms, isEthiopic } from '@/lib/options';
import { cn } from '@/lib/utils';
import { Type } from 'lucide-react';
import { PronunciationNote } from '@/components/pronunciation-note';

export default function Fidel() {
  const { t, lang } = useApp();
  const q = useGetCourses();
  const [fam, setFam] = useState(0);
  const [ch, setCh] = useState<string | null>(null);

  const first = useMemo(() => q.data?.slice().sort((a, b) => a.month - b.month)[0], [q.data]);
  const letters = useMemo(() => {
    const m = new Map<string, { lessonId: string; word: Word }[]>();
    first?.lessons.forEach((l) =>
      l.words.forEach((w) =>
        Array.from(w.amharic).filter(isEthiopic).forEach((c) => {
          const arr = m.get(c) ?? [];
          if (!arr.some((x) => x.word.id === w.id)) arr.push({ lessonId: l.id, word: w });
          m.set(c, arr);
        }),
      ),
    );
    return m;
  }, [first]);
  const sel = ch ? letters.get(ch) : undefined;

  return (
    <Shell>
      <PageHead eyebrow="ፊደል" title={t('تعلّم الفيدل', 'Learn Fidel')} sub={t('الفيدل مقطعي: كل رمز هو حرف ساكن مع حركة. ابدأ بالعائلات ثم اقرأ كلمات مقررك الأول.', 'Fidel is a syllabary: each symbol is a consonant plus a vowel. Start with the families, then read words from your first course.')} />

      <Card className="mb-6">
        <h2 className="font-display mb-3 text-lg font-bold">{t('عائلات الحروف وصيغها السبع', 'Letter families and their seven forms')}</h2>
        <div className="mb-4 flex flex-wrap gap-1.5" dir="ltr">
          {FIDEL_FAMILIES.map((f, i) => (
            <button key={f.base} type="button" data-testid={`button-family-${i}`} onClick={() => setFam(i)}
              className={cn('am press size-11 rounded-xl border text-xl', i === fam ? 'border-gold bg-gold text-gold-foreground' : 'border-border bg-background')}>
              {String.fromCodePoint(f.base)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2" dir="ltr" key={fam}>
          {fidelForms(FIDEL_FAMILIES[fam].base).map((c, i) => (
            <button key={c.ch} type="button" onClick={() => setCh(c.ch)} data-testid={`button-form-${i}`} className="pop press rounded-2xl bg-secondary py-3" style={{ animationDelay: `${i * 35}ms` }}>
              <Am className="block text-3xl font-semibold text-primary sm:text-5xl">{c.ch}</Am>
              <span className="block text-sm text-muted-foreground" dir="rtl" lang="ar">{c.pronunciation}</span>
            </button>
          ))}
        </div>
        <PronunciationNote />
      </Card>

      <h2 className="font-display mb-1 text-xl font-bold">{t('حروف من مقررك الأول', 'Letters from your first course')}</h2>
      {first && <p className="mb-3 text-sm text-muted-foreground">{lang === 'ar' ? first.titleAr : first.titleEn}</p>}
      {q.isLoading && <Skeleton className="h-40" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {q.data && letters.size === 0 && <Empty icon={<Type />} title={t('لا حروف متاحة بعد', 'No letters available yet')} />}
      {letters.size > 0 && (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-wrap gap-2" dir="ltr">
            {Array.from(letters.keys()).map((c) => (
              <button key={c} type="button" onClick={() => setCh(c)} data-testid={`button-letter-${c}`}
                className={cn('am press size-14 rounded-2xl border text-2xl', ch === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
                {c}
              </button>
            ))}
          </div>
          <Card data-testid="panel-letter">
            {ch && sel ? (
              <div key={ch} className="rise">
                <Am className="block text-7xl font-bold text-primary">{ch}</Am>
                <p className="mb-2 mt-2 text-sm font-semibold">{t('كلمات تحتوي هذا الحرف', 'Words with this letter')}</p>
                <ul className="space-y-2">
                  {sel.map(({ word, lessonId }) => (
                    <li key={word.id}>
                      <Link href={`/lesson/${lessonId}`} className="lift flex items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2">
                        <Am className="text-xl font-semibold">{word.amharic}</Am>
                        <span className="text-sm">{lang === 'ar' ? word.arabic : word.english}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t('الصوت بانتظار تسجيلات مراجَعة.', 'Audio awaiting reviewed recordings.')}</p>
              </div>
            ) : <p className="py-8 text-center text-muted-foreground">{t('اختر حرفًا لترى كلماته.', 'Choose a letter to see its words.')}</p>}
          </Card>
        </div>
      )}
      <PilotNote className="mt-6" />
      <PilotNote kind="audio" className="mt-3" />
    </Shell>
  );
}
