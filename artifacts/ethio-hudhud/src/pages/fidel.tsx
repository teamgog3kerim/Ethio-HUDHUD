import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useGetCourses } from '@workspace/api-client-react';
import { Am, Btn, Card, ErrorState, PageHead, PilotNote, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { FIDEL_FAMILIES, fidelForms, isEthiopic } from '@/lib/options';
import { buildFidelExamples, examplesForFamily, examplesForLetter, FIDEL_VOCABULARY, type FidelExample } from '@/lib/fidel-vocabulary';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { PronunciationNote } from '@/components/pronunciation-note';

const PAGE = 12;

function famIndexOf(c: string) {
  const cp = c.codePointAt(0) ?? 0;
  return FIDEL_FAMILIES.findIndex((f) => cp >= f.base && cp < f.base + 7);
}

export default function Fidel() {
  const { t, lang } = useApp();
  const q = useGetCourses();
  const [fam, setFam] = useState(0);
  const [ch, setCh] = useState<string | null>(null);
  const [showFamily, setShowFamily] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [practice, setPractice] = useState(false);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const first = useMemo(() => q.data?.slice().sort((a, b) => a.month - b.month)[0], [q.data]);
  const all: FidelExample[] = useMemo(() => {
    const ce = (first?.lessons ?? []).flatMap((l) => l.words.map((word) => ({ lessonId: l.id, word })));
    return buildFidelExamples(ce);
  }, [first]);
  const courseLetters = useMemo(() => {
    const s = new Set<string>();
    first?.lessons.forEach((l) => l.words.forEach((w) => Array.from(w.amharic).forEach((c) => { if (isEthiopic(c) && /\p{L}/u.test(c)) s.add(c); })));
    return Array.from(s);
  }, [first]);

  const forms = useMemo(() => fidelForms(FIDEL_FAMILIES[fam].base), [fam]);
  const defaultCh = useMemo(
    () => forms.find((f) => examplesForLetter(all, f.ch).length > 0)?.ch ?? forms[0].ch,
    [all, forms],
  );
  const letter = ch && (famIndexOf(ch) === fam || courseLetters.includes(ch)) ? ch : defaultCh;
  const exact = useMemo(() => examplesForLetter(all, letter), [all, letter]);
  const famBase = FIDEL_FAMILIES[fam].base;
  const famEx = useMemo(() => examplesForFamily(all, famBase), [all, famBase]);
  const familyMode = exact.length === 0 && showFamily && famIndexOf(letter) === fam;
  const list = exact.length > 0 ? exact : familyMode ? famEx : [];
  const cur = list[Math.min(idx, Math.max(0, list.length - 1))];

  useEffect(() => {
    setLimit(PAGE); setPractice(false); setIdx(0); setRevealed(false); setShowFamily(false);
  }, [letter, fam, all]);

  const pick = (c: string) => {
    setCh(c);
    const i = famIndexOf(c);
    if (i >= 0) setFam(i);
  };
  const go = (d: number) => { setIdx((i) => (i + d + list.length) % list.length); setRevealed(false); };
  const meaning = (e: FidelExample) => (lang === 'ar' ? e.arabic : e.english);

  return (
    <Shell>
      <PageHead eyebrow="ፊደል" title={t('تعلّم الفيدل', 'Learn Fidel')} sub={t('الفيدل مقطعي: كل رمز هو حرف ساكن مع حركة. اختر حرفًا لترى كلمات يومية تحتويه.', 'Fidel is a syllabary: each symbol is a consonant plus a vowel. Pick a letter to see everyday words that contain it.')} />

      <Card className="mb-6">
        <h2 className="font-display mb-3 text-lg font-bold">{t('عائلات الحروف وصيغها السبع', 'Letter families and their seven forms')}</h2>
        <div className="mb-4 flex flex-wrap gap-1.5" dir="ltr">
          {FIDEL_FAMILIES.map((f, i) => (
            <button key={f.base} type="button" data-testid={`button-family-${i}`} aria-pressed={i === fam} onClick={() => { setFam(i); setCh(null); }}
              className={cn('am press size-11 rounded-xl border text-xl', i === fam ? 'border-gold bg-gold text-gold-foreground' : 'border-border bg-background')}>
              {String.fromCodePoint(f.base)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2" dir="ltr" key={fam}>
          {forms.map((c, i) => (
            <button key={c.ch} type="button" aria-pressed={c.ch === letter} onClick={() => pick(c.ch)} data-testid={`button-form-${i}`}
              className={cn('pop press min-h-11 rounded-2xl py-3', c.ch === letter ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary')} style={{ animationDelay: `${i * 35}ms` }}>
              <Am className="block text-3xl font-semibold text-primary sm:text-5xl">{c.ch}</Am>
              <span className="block text-sm text-muted-foreground" dir="rtl" lang="ar">{c.pronunciation}</span>
            </button>
          ))}
        </div>
        <PronunciationNote />
      </Card>

      <Card data-testid="panel-letter" className="mb-6">
        <div key={letter} className="rise">
          <div className="mb-3 flex items-center gap-4">
            <Am className="block text-7xl font-bold text-primary">{letter}</Am>
            <div>
              <p className="font-display text-lg font-bold">{t('كلمات تحتوي هذا الحرف', 'Words with this letter')}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-example-count">
                {exact.length > 0
                  ? t(`${exact.length} كلمة`, `${exact.length} words`)
                  : familyMode ? t(`${famEx.length} كلمة من العائلة`, `${famEx.length} words from the family`) : t('لا كلمات بعد', 'No words yet')}
              </p>
            </div>
          </div>

          {exact.length === 0 && (
            <div className="mb-3 rounded-2xl border border-dashed border-input p-4 text-sm" data-testid="state-no-exact">
              <p>{t('لا تتوفر أمثلة بهذا الشكل بالضبط في هذه المجموعة بعد. يمكنك استكشاف صيغ أخرى من عائلة الحرف.', 'This collection has no examples with this exact form yet. You can explore other forms in the same letter family.')}</p>
              {famEx.length > 0 && !familyMode && famIndexOf(letter) === fam && (
                <Btn variant="outline" size="sm" className="mt-3" onClick={() => setShowFamily(true)} data-testid="button-show-family">
                  {t(`عرض كلمات العائلة (${famEx.length})`, `Show family words (${famEx.length})`)}
                </Btn>
              )}
              {familyMode && <p className="mt-2 font-semibold text-[hsl(39_70%_38%)] dark:text-gold" data-testid="note-not-exact">{t('ليست مطابقة تمامًا: هذه كلمات من عائلة الحرف نفسه بحركات أخرى.', 'Not an exact match: these words use the same family with other vowels.')}</p>}
            </div>
          )}

          {list.length > 0 && (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.slice(0, limit).map((e) => {
                  const body = (
                    <>
                      <Am className="block break-words text-xl font-semibold">{e.amharic}</Am>
                      <span className="block text-xs text-muted-foreground">{t('النطق التقريبي بالعربية', 'Approximate Arabic-script pronunciation')}</span>
                      <span className="block break-words text-base text-primary" dir="rtl" lang="ar" data-testid={`fidel-pronunciation-${e.id}`}>{e.transliteration}</span>
                      <span className="block break-words text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang === 'ar' ? 'ar' : 'en'}>
                        <span className="text-muted-foreground">{t('المعنى: ', 'Meaning: ')}</span>{meaning(e)}
                      </span>
                    </>
                  );
                  return (
                    <li key={e.id}>
                      {e.lessonId
                        ? <Link href={`/lesson/${e.lessonId}`} className="lift block min-h-11 space-y-1 rounded-xl bg-secondary px-3 py-3">{body}</Link>
                        : <div className="min-h-11 space-y-1 rounded-xl bg-secondary px-3 py-3">{body}</div>}
                    </li>
                  );
                })}
              </ul>
              {list.length > limit && (
                <Btn variant="outline" className="mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)} data-testid="button-more-examples">
                  {t(`عرض المزيد (${list.length - limit})`, `Show more (${list.length - limit})`)}
                </Btn>
              )}

              <div className="mt-5 border-t border-border pt-4">
                {!practice ? (
                  <Btn variant="gold" onClick={() => { setPractice(true); setIdx(0); setRevealed(false); }} data-testid="button-start-reading">
                    {t('تدرّب على القراءة', 'Practise reading')}
                  </Btn>
                ) : cur && (
                  <div data-testid="panel-reading" className="rounded-2xl bg-secondary p-4 text-center">
                    <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">{idx + 1} / {list.length}</p>
                    <Am className="block break-words text-5xl font-bold">{cur.amharic}</Am>
                    {revealed ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-muted-foreground">{t('النطق التقريبي بالعربية', 'Approximate Arabic-script pronunciation')}</p>
                        <p className="text-lg text-primary" dir="rtl" lang="ar">{cur.transliteration}</p>
                        <p dir={lang === 'ar' ? 'rtl' : 'ltr'}><span className="text-muted-foreground">{t('المعنى: ', 'Meaning: ')}</span>{meaning(cur)}</p>
                      </div>
                    ) : <p className="mt-3 text-sm text-muted-foreground">{t('اقرأ الكلمة بصوت عالٍ ثم اكشف النطق.', 'Read the word aloud, then reveal.')}</p>}
                    <div className="mt-4 flex items-center justify-center gap-2" dir="ltr">
                      <Btn variant="outline" onClick={() => go(-1)} aria-label={t('السابق', 'Previous')} data-testid="button-prev-word"><ChevronLeft className="size-4" /></Btn>
                      <Btn variant="primary" onClick={() => setRevealed((r) => !r)} data-testid="button-reveal">
                        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {revealed ? t('إخفاء', 'Hide') : t('كشف', 'Reveal')}
                      </Btn>
                      <Btn variant="outline" onClick={() => go(1)} aria-label={t('التالي', 'Next')} data-testid="button-next-word"><ChevronRight className="size-4" /></Btn>
                    </div>
                    <Btn variant="ghost" size="sm" className="mt-2" onClick={() => setPractice(false)}>{t('إغلاق', 'Close')}</Btn>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{t('حروف من مقررك الأول', 'Letters from your first course')}</h2>
        <span className="text-xs text-muted-foreground">{t(`${FIDEL_VOCABULARY.length} كلمة في المجموعة الإضافية`, `${FIDEL_VOCABULARY.length} words in the extra collection`)}</span>
      </div>
      {first && <p className="mb-3 text-sm text-muted-foreground">{lang === 'ar' ? first.titleAr : first.titleEn}</p>}
      {q.isLoading && <Skeleton className="h-24" />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} />}
      {courseLetters.length > 0 && (
        <div className="flex flex-wrap gap-2" dir="ltr">
          {courseLetters.map((c) => (
            <button key={c} type="button" onClick={() => pick(c)} data-testid={`button-letter-${c}`}
              className={cn('am press size-14 rounded-2xl border text-2xl', letter === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card')}>
              {c}
            </button>
          ))}
        </div>
      )}
      <PilotNote kind="audio" className="mt-6" />
    </Shell>
  );
}
