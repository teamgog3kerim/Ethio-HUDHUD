import type { Profile, ProfileInput } from '@workspace/api-client-react';

export function toInput(p: Profile): ProfileInput {
  return {
    displayName: p.displayName,
    level: p.level,
    goals: p.goals,
    dailyGoal: p.dailyGoal,
    timezone: p.timezone,
    reminderTime: p.reminderTime,
    reminderEnabled: p.reminderEnabled,
    language: p.language,
    onboardingComplete: p.onboardingComplete,
    retainChat: p.retainChat,
  };
}

export const GOALS: { id: string; ar: string; en: string }[] = [
  { id: 'travel', ar: 'السفر إلى إثيوبيا', en: 'Travel to Ethiopia' },
  { id: 'family', ar: 'التواصل مع العائلة', en: 'Talk with family' },
  { id: 'work', ar: 'العمل والتجارة', en: 'Work and trade' },
  { id: 'study', ar: 'الدراسة', en: 'Study' },
  { id: 'reading', ar: 'قراءة الفيدل', en: 'Read Fidel' },
  { id: 'conversation', ar: 'محادثة يومية', en: 'Daily conversation' },
  { id: 'culture', ar: 'الثقافة والأدب', en: 'Culture and literature' },
];

export const MINUTE_CHOICES = [10, 15, 20, 30, 45, 60];

export const SCENARIOS: { id: string; ar: string; en: string }[] = [
  { id: 'free', ar: 'محادثة حرة', en: 'Free chat' },
  { id: 'greetings', ar: 'التحيات', en: 'Greetings' },
  { id: 'introductions', ar: 'التعارف', en: 'Introductions' },
  { id: 'market', ar: 'في السوق', en: 'At the market' },
  { id: 'cafe', ar: 'في المقهى', en: 'At the cafe' },
  { id: 'directions', ar: 'السؤال عن الطريق', en: 'Asking directions' },
];

// Real Ge'ez (Fidel) consonant families. Each family is 8 consecutive code
// points: seven vowel orders (+ labialised form which we skip).
export const FIDEL_FAMILIES: { base: number; arabic: string }[] = [
  { base: 0x1200, arabic: 'ه' }, { base: 0x1208, arabic: 'ل' }, { base: 0x1210, arabic: 'ه' },
  { base: 0x1218, arabic: 'م' }, { base: 0x1220, arabic: 'س' }, { base: 0x1228, arabic: 'ر' },
  { base: 0x1230, arabic: 'س' }, { base: 0x1240, arabic: 'ق' }, { base: 0x1260, arabic: 'ب' },
  { base: 0x1270, arabic: 'ت' }, { base: 0x1290, arabic: 'ن' }, { base: 0x12a0, arabic: 'أ' },
  { base: 0x12a8, arabic: 'ك' }, { base: 0x12c8, arabic: 'و' }, { base: 0x12d0, arabic: 'أ' },
  { base: 0x12d8, arabic: 'ز' }, { base: 0x12e8, arabic: 'ي' }, { base: 0x12f0, arabic: 'د' },
  { base: 0x1308, arabic: 'گ' }, { base: 0x1320, arabic: 'ط' }, { base: 0x1330, arabic: 'پ' },
  { base: 0x1338, arabic: 'ص' }, { base: 0x1348, arabic: 'ف' }, { base: 0x1350, arabic: 'پ' },
];
export const FIDEL_ORDERS = ['َ', 'ُو', 'ِي', 'َا', 'ِي', 'ِ', 'ُو'];
export const fidelForms = (base: number) =>
  FIDEL_ORDERS.map((v, i) => ({
    ch: String.fromCodePoint(base + i),
    pronunciation: `${FIDEL_FAMILIES.find(f => f.base === base)!.arabic}${v}`,
  }));

export function isEthiopic(ch: string) {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0x1200 && c <= 0x137f;
}
