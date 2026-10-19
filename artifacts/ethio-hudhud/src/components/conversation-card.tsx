import { useId, useState } from 'react';
import type { DialogueTurn } from '@workspace/api-client-react';
import { Am, Card } from '@/components/bits';
import { PronunciationNote } from '@/components/pronunciation-note';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export function ConversationCard({ turns }: { turns: DialogueTurn[] }) {
  const { t, lang } = useApp();
  const replyId = useId();
  const [showPronunciation, setShowPronunciation] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const speakerKey = (turn: DialogueTurn) => JSON.stringify([turn.speakerAr, turn.speakerEn]);
  const speakers = turns.filter((turn, i) => turns.findIndex(other => speakerKey(other) === speakerKey(turn)) === i);
  const chooseRole = (next: string | null) => { setRole(next); setRevealed(new Set()); };
  return <Card data-testid="conversation-transcript">
    <h2 className="font-display text-xl font-bold">{t('اقرأ المحادثة وتبادل الأدوار', 'Read the conversation and swap roles')}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t('اختر متحدثاً لإخفاء ردوده، وجرّب الرد بنفسك قبل كشف كل رد. هذا تدريب ذاتي دون تقييم للنطق.', 'Choose a speaker to hide their replies, then try replying before revealing each one. This is self-practice, without pronunciation assessment.')}</p>
    <div role="group" aria-label={t('اختر دورك', 'Choose your role')} className="mt-4 flex flex-wrap gap-2">
      <button type="button" aria-pressed={role === null} onClick={() => chooseRole(null)} data-testid="button-dialogue-read-all"
        className={cn('press rounded-full border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', role === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
        {t('قراءة الكل', 'Read all')}
      </button>
      {speakers.map((speaker, i) => <button key={speakerKey(speaker)} type="button" aria-pressed={role === speakerKey(speaker)}
        onClick={() => chooseRole(speakerKey(speaker))} data-testid={`button-practise-speaker-${i}`}
        className={cn('press rounded-full border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', role === speakerKey(speaker) ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
        {t('تدرّب بدور: ', 'Practise as: ')}{lang === 'ar' ? speaker.speakerAr : speaker.speakerEn}
      </button>)}
    </div>
    {role !== null && <button type="button" onClick={() => setRevealed(new Set())} data-testid="button-reset-dialogue"
      className="press mt-3 rounded-full border border-border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      {t('إعادة التدريب وإخفاء الردود', 'Reset practice and hide replies')}
    </button>}
    <button type="button" className="press my-4 rounded-full border border-border px-4 py-2 text-sm"
      aria-pressed={showPronunciation} data-testid="button-toggle-dialogue-pronunciation" onClick={() => setShowPronunciation(v => !v)}>
      {showPronunciation ? t('إخفاء النطق بالعربية', 'Hide Arabic pronunciation') : t('إظهار النطق بالعربية', 'Show Arabic pronunciation')}
    </button>
    <ol className="space-y-4">
      {turns.map((turn, i) => {
        const practising = role === speakerKey(turn);
        const visible = !practising || revealed.has(i);
        return <li key={i} data-testid={`dialogue-turn-${i}`}
        className={cn('rounded-2xl border border-border p-4', i % 2 ? 'bg-secondary sm:ms-8' : 'bg-primary/5 sm:me-8')}>
        <p className="mb-2 text-sm font-bold text-primary">{lang === 'ar' ? turn.speakerAr : turn.speakerEn}</p>
        {practising && <button type="button" aria-expanded={visible} aria-controls={`${replyId}-${i}`}
          aria-label={`${visible ? t('إخفاء الرد', 'Hide reply') : t('كشف الرد', 'Reveal reply')} ${i + 1}: ${lang === 'ar' ? turn.speakerAr : turn.speakerEn}`}
          data-testid={`button-reveal-dialogue-${i}`} onClick={() => setRevealed(previous => {
            const next = new Set(previous);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
          })}
          className="press rounded-full border border-primary px-4 py-2 text-sm text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          {visible ? t('إخفاء الرد', 'Hide reply') : t('كشف الرد', 'Reveal reply')}
        </button>}
        <div id={`${replyId}-${i}`} aria-live="polite" aria-atomic="true">
        {visible ? <>
        <Am className="block text-2xl leading-loose sm:text-3xl">{turn.amharic}</Am>
        {showPronunciation && <p dir="rtl" lang="ar" className="mt-2 text-lg leading-loose text-muted-foreground" data-testid={`dialogue-pronunciation-${i}`}>{turn.transliteration}</p>}
        <p dir="rtl" lang="ar" className="mt-2 font-medium leading-relaxed">{turn.arabic}</p>
        </> : <p className="mt-2 text-sm text-muted-foreground">{t('دورك — حاول الرد ثم اكشف الجملة.', 'Your turn — try replying, then reveal the line.')}</p>}
        </div>
      </li>; })}
    </ol>
    {showPronunciation && <PronunciationNote />}
  </Card>;
}
