import { useState } from 'react';
import type { DialogueTurn } from '@workspace/api-client-react';
import { Am, Card } from '@/components/bits';
import { PronunciationNote } from '@/components/pronunciation-note';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export function ConversationCard({ turns }: { turns: DialogueTurn[] }) {
  const { t, lang } = useApp();
  const [showPronunciation, setShowPronunciation] = useState(true);
  return <Card data-testid="conversation-transcript">
    <h2 className="font-display text-xl font-bold">{t('اقرأ المحادثة وتبادل الأدوار', 'Read the conversation and swap roles')}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t('اقرأ سطر كل متحدث، ثم جرّب الرد بنفسك قبل النظر إلى الجملة التالية.', 'Read each speaker’s line, then try replying before reading the next turn.')}</p>
    <button type="button" className="press my-4 rounded-full border border-border px-4 py-2 text-sm"
      aria-pressed={showPronunciation} data-testid="button-toggle-dialogue-pronunciation" onClick={() => setShowPronunciation(v => !v)}>
      {showPronunciation ? t('إخفاء النطق بالعربية', 'Hide Arabic pronunciation') : t('إظهار النطق بالعربية', 'Show Arabic pronunciation')}
    </button>
    <ol className="space-y-4">
      {turns.map((turn, i) => <li key={i} data-testid={`dialogue-turn-${i}`}
        className={cn('rounded-2xl border border-border p-4', i % 2 ? 'bg-secondary sm:ms-8' : 'bg-primary/5 sm:me-8')}>
        <p className="mb-2 text-sm font-bold text-primary">{lang === 'ar' ? turn.speakerAr : turn.speakerEn}</p>
        <Am className="block text-2xl leading-loose sm:text-3xl">{turn.amharic}</Am>
        {showPronunciation && <p dir="rtl" lang="ar" className="mt-2 text-lg leading-loose text-muted-foreground" data-testid={`dialogue-pronunciation-${i}`}>{turn.transliteration}</p>}
        <p dir="rtl" lang="ar" className="mt-2 font-medium leading-relaxed">{turn.arabic}</p>
      </li>)}
    </ol>
    {showPronunciation && <PronunciationNote />}
  </Card>;
}
