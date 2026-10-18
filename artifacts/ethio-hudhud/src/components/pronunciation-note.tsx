import { useApp } from '@/lib/app';

export function PronunciationNote() {
  const { t } = useApp();
  return <p className="mt-3 text-xs leading-relaxed text-muted-foreground" data-testid="pronunciation-note">
    {t(
      'النطق بالحروف العربية تقريبي وينتظر المراجعة اللغوية؛ بعض أصوات الأمهرية وحركاتها لا مقابل دقيق لها في العربية. گ: جيم قاهرية، چ: تاء وشين متصلتان، پ: باء مهموسة.',
      'Arabic-script pronunciation is approximate and awaits linguistic review; some Amharic sounds and vowels have no exact Arabic equivalent. گ: hard g, چ: ch, پ: p.',
    )}
  </p>;
}
