import type { LessonContent } from "./seed-data";

// Approximate Arabic-script guides for the pilot curriculum. These are reading
// aids, not reviewed phonetic transcriptions or substitutes for native audio.
// Keep the legacy spellings here so previously stored lessons need no data reset.
export const ARABIC_PRONUNCIATIONS: Readonly<Record<string, string>> = {
  hä: "هَ", hu: "هُو", hi: "هِي", ha: "هَا", he: "هِي", hə: "هِ", ho: "هُو",
  lä: "لَ", lu: "لُو", li: "لِي", la: "لَا", le: "لِي", lə: "لِ", lo: "لُو",
  sälam: "سَلَام",
  amäsäggənallähu: "أَمَسَگِّنَالَّهُو",
  əši: "إِشِي", dähna: "دَهْنَا",
  əne: "إِنِي", antä: "أَنْتَ", anči: "أَنْچِي", səm: "سِمْ",
  and: "أَنْدْ", hulätt: "هُلَتْ", sost: "سُوسْتْ", arat: "أَرَاتْ", aməst: "أَمِسْتْ",
  ənnat: "إِنَّاتْ", abbat: "أَبَّاتْ", betäsäb: "بِيتَسَبْ", bet: "بِيتْ",
  man: "مَانْ", mən: "مِنْ", yät: "يَتْ", mäče: "مَچِي",
  zare: "زَارِي", nägä: "نَگَ", tənant: "تِنَانْتْ", ahun: "أَهُونْ",
  buna: "بُونَا", wəha: "وِهَا", šay: "شَايْ", ənjära: "إِنْجَرَا", məgəb: "مِگِبْ",
  taksi: "تَاكْسِي", mäkina: "مَكِينَا", hotel: "هُوتِيلْ", mängäd: "مَنْگَدْ",
  səra: "سِرَا", biro: "بِيرُو", səbsäba: "سِبْسَبَا", säʿat: "سَعَاتْ",
  säñño: "سَنْيُو", maksäñño: "مَكْسَنْيُو", räbuʿ: "رَبُوعْ", hamus: "هَامُوسْ", arb: "أَرْبْ",
};

export function isArabicPronunciation(value: string): boolean {
  return /\p{Script=Arabic}/u.test(value) &&
    !/[^\p{Script=Arabic}\p{M}\p{N}\p{P}\p{Z}\s]/u.test(value);
}

export function arabicPronunciation(value: string): string {
  const text = value.trim().normalize("NFC");
  if (isArabicPronunciation(text)) return text;
  // Never invent a pronunciation for unfamiliar, editor-created vocabulary.
  return Object.hasOwn(ARABIC_PRONUNCIATIONS, text)
    ? ARABIC_PRONUNCIATIONS[text]! : "النطق العربي بانتظار المراجعة";
}

export function arabicLearningText(value: string): string {
  return value
    .replace("الرمز ä يعبّر تقريبياً عن صوت مركزي ولا يطابق حركة عربية تماماً.", "النطق بالحروف العربية تقريب مساعد؛ بعض الحركات الأمهرية لا تطابق الحركات العربية تماماً.")
    .replaceAll("النقل اللاتيني", "النطق بالحروف العربية")
    .replaceAll("النطق اللاتيني", "النطق بالحروف العربية")
    .replace(/[\p{Script=Latin}\p{M}ʾʿ]+/gu, token =>
      Object.hasOwn(ARABIC_PRONUNCIATIONS, token.normalize("NFC"))
        ? ARABIC_PRONUNCIATIONS[token.normalize("NFC")]! : token);
}

export function arabicLessonContent(content: LessonContent): LessonContent {
  return {
    ...content,
    ...(content.dialogue ? { dialogue: content.dialogue.map(turn => ({
      ...turn, arabic: arabicLearningText(turn.arabic),
      transliteration: arabicPronunciation(turn.transliteration),
    })) } : {}),
    objective: arabicLearningText(content.objective),
    explanation: arabicLearningText(content.explanation),
    words: content.words.map(word => ({
      ...word,
      arabic: arabicLearningText(word.arabic),
      english: word.english.startsWith("syllable ")
        ? `syllable ${arabicPronunciation(word.english.slice(9))}` : word.english,
      transliteration: arabicPronunciation(word.transliteration),
    })),
    exercises: content.exercises.map(exercise => ({
      ...exercise,
      prompt: arabicLearningText(exercise.prompt),
      options: exercise.options.map(arabicLearningText),
    })),
  };
}

export function arabicAnswerKey<T extends { explanation: string }>(keys: T[]): T[] {
  return keys.map(key => ({ ...key, explanation: arabicLearningText(key.explanation) }));
}

// Tutor replies are free-form prose, unlike dedicated lesson pronunciation
// fields. Do not turn ordinary English "and" or "man" into pronunciation guides.
export function arabicTutorText(value: string): string {
  return value.replace(/[\p{Script=Latin}\p{M}ʾʿ]+/gu, (token: string, offset: number) => {
    const key = token.normalize("NFC");
    if (!Object.hasOwn(ARABIC_PRONUNCIATIONS, key)) return token;
    const prefix = value.slice(0, offset);
    const distinctPhoneticSpelling = /[^\x00-\x7f]/.test(token);
    const followsAmharic = /\p{Script=Ethiopic}[\s(*`"':：—–-]*$/u.test(prefix);
    const labeledPronunciation = /(?:النطق|تُقرأ|تقرأ|تُنطق|تنطق|pronounced|pronunciation)[\s:：(*`"']*$/iu.test(prefix);
    return distinctPhoneticSpelling || followsAmharic || labeledPronunciation
      ? ARABIC_PRONUNCIATIONS[key]! : token;
  });
}
