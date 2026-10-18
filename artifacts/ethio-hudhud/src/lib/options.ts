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
export const FIDEL_FAMILIES: { base: number; latin: string }[] = [
  { base: 0x1200, latin: 'h' }, { base: 0x1208, latin: 'l' }, { base: 0x1210, latin: 'ḥ' },
  { base: 0x1218, latin: 'm' }, { base: 0x1220, latin: 'ś' }, { base: 0x1228, latin: 'r' },
  { base: 0x1230, latin: 's' }, { base: 0x1240, latin: 'q' }, { base: 0x1260, latin: 'b' },
  { base: 0x1270, latin: 't' }, { base: 0x1290, latin: 'n' }, { base: 0x12a0, latin: 'ʾ' },
  { base: 0x12a8, latin: 'k' }, { base: 0x12c8, latin: 'w' }, { base: 0x12d0, latin: 'ʿ' },
  { base: 0x12d8, latin: 'z' }, { base: 0x12e8, latin: 'y' }, { base: 0x12f0, latin: 'd' },
  { base: 0x1308, latin: 'g' }, { base: 0x1320, latin: 'ṭ' }, { base: 0x1330, latin: 'ṗ' },
  { base: 0x1338, latin: 'ṣ' }, { base: 0x1348, latin: 'f' }, { base: 0x1350, latin: 'p' },
];
export const FIDEL_ORDERS = ['ä', 'u', 'i', 'a', 'e', 'ə', 'o'];
export const fidelForms = (base: number) =>
  FIDEL_ORDERS.map((v, i) => ({ ch: String.fromCodePoint(base + i), vowel: v }));

export function isEthiopic(ch: string) {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0x1200 && c <= 0x137f;
}
