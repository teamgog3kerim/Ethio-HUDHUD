// Public primary URL verified through deployment metadata. Never use a preview
// origin or a learner-specific URL in invitations.
export const INVITE_APP_URL = "https://ethio-hudhud.replit.app";

export const INVITE_MESSAGES = [
  {
    ar: "بدأت رحلتي في تعلّم الأمهرية مع Ethio HUDHUD! تعلّم معي لغة جديدة واكتشف جمال إثيوبيا.",
    en: "I’ve started learning Amharic with Ethio HUDHUD! Learn a new language with me and discover the beauty of Ethiopia.",
  },
  {
    ar: "أنهيت درساً جديداً في الأمهرية وحققت تقدّماً رائعاً. هل تنضم إليّ في تحدّي التعلّم؟",
    en: "I’ve finished another Amharic lesson and made great progress. Will you join me in the learning challenge?",
  },
  {
    ar: "هل تريد تعلّم اللغة الأمهرية؟ انضم إليّ في Ethio HUDHUD ولنبدأ رحلتنا معاً!",
    en: "Want to learn Amharic? Join me on Ethio HUDHUD and let’s start learning together!",
  },
  {
    ar: "حققت إنجازاً جديداً في تعلّم الأمهرية. من مستعد لتحدّي الكلمات الجديد؟",
    en: "I’ve reached a new milestone in learning Amharic. Who’s ready for a new vocabulary challenge?",
  },
] as const;

export function getInviteText(index: number, lang: "ar" | "en"): string {
  const template = INVITE_MESSAGES[index] ?? INVITE_MESSAGES[0];
  const action = lang === "ar"
    ? "تعرّف على الخطط وابدأ تعلّم الأمهرية معي:"
    : "Explore the plans and start learning Amharic with me:";
  return `${template[lang]}\n\n${action}\n${INVITE_APP_URL}`;
}

export function getInviteLinks(text: string) {
  // Split the domain from Telegram's text field so the link appears only once.
  const message = text.replaceAll(INVITE_APP_URL, "").trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(INVITE_APP_URL)}&text=${encodeURIComponent(message)}`,
  };
}
