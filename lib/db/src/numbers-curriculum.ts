import type { LessonInput, WordTuple } from "./seed-data";

// Pilot reading aids: Arabic spelling approximates Amharic sounds, not native audio.
const units = [
  ["ዜሮ", "زيرو", "صفر"],
  ["አንድ", "أَنْدْ", "واحد"],
  ["ሁለት", "هُلَتْ", "اثنان"],
  ["ሶስት", "سُوسْتْ", "ثلاثة"],
  ["አራት", "أَرَاتْ", "أربعة"],
  ["አምስት", "أَمِسْتْ", "خمسة"],
  ["ስድስት", "سِدِسْتْ", "ستة"],
  ["ሰባት", "سَبَاتْ", "سبعة"],
  ["ስምንት", "سِمِنْتْ", "ثمانية"],
  ["ዘጠኝ", "زَطَنيْ", "تسعة"],
] as const;
const tens = [
  ["", "", ""],
  ["አስር", "أَسِرْ", "عشرة"],
  ["ሃያ", "هَايَا", "عشرون"],
  ["ሰላሳ", "سَلَاسَا", "ثلاثون"],
  ["አርባ", "أَرْبَا", "أربعون"],
  ["ሃምሳ", "هَامْسَا", "خمسون"],
  ["ስልሳ", "سِلْسَا", "ستون"],
  ["ሰባ", "سَبَا", "سبعون"],
  ["ሰማንያ", "سَمَانْيَا", "ثمانون"],
  ["ዘጠና", "زَطَنَا", "تسعون"],
] as const;
const teensAr = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];

export function numberWord(value: number): WordTuple {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RangeError("Number curriculum covers integers from 0 to 100.");
  }
  if (value < 10) {
    const [am, pronunciation, meaning] = units[value]!;
    return [am, `${value} · ${meaning}`, String(value), pronunciation];
  }
  if (value === 100) return ["አንድ መቶ", "100 · مئة", "100", "أَنْدْ مَتُو"];
  const ten = Math.floor(value / 10);
  const unit = value % 10;
  const [am, pronunciation, meaning] = tens[ten]!;
  if (!unit) return [am, `${value} · ${meaning}`, String(value), pronunciation];
  const [unitAm, unitPronunciation, unitMeaning] = units[unit]!;
  return [
    `${ten === 1 ? "አስራ" : am} ${unitAm}`,
    `${value} · ${ten === 1 ? teensAr[unit] : `${unitMeaning} و${meaning}`}`,
    String(value),
    `${ten === 1 ? "أَسْرَا" : pronunciation} ${unitPronunciation}`,
  ];
}

const modules = [
  ["fidel", 0, 10, "العدّ الأول", "First steps in counting", "عدّ الأشياء أمامك من صفر إلى عشرة. ميّز الصفر عن الواحد، ثم اقرأ العدد والكلمة الأمهرية ودليل النطق العربي."],
  ["everyday", 11, 20, "الأعداد في الحياة اليومية", "Everyday numbers", "تدرّب على أعداد الأشخاص والأشياء. للأعداد من أحد عشر إلى تسعة عشر تُستعمل አስራ قبل الآحاد؛ أمّا عشرة وحدها فتُكتب አስር. عشرون هي ሃያ."],
  ["reading", 21, 30, "قراءة الأعداد المركّبة", "Reading compound numbers", "اقرأ العشرات أولاً ثم الآحاد في الأمهرية: ሃያ አንድ هو 21. في العربية نقول واحداً وعشرين؛ لاحظ اختلاف ترتيب الكلمات. تدرب على قراءة أرقام صفحات من 21 إلى 30."],
  ["reading", 31, 40, "الأعداد والصفحات", "Numbers and pages", "حدّد رقم صفحة أو رقم تمرين من 31 إلى 40. ሰላሳ تعني ثلاثين وአርባ تعني أربعين. اقرأ أولاً، ثم أخفِ دليل النطق وحاول التذكر."],
  ["speaking", 41, 50, "الكميات والتسوّق", "Quantities and shopping", "تمرّن على تمييز الكميات من 41 إلى 50. ابدأ بالعشرات ثم أضف الآحاد؛ لا تستبدل ترتيب العدد الأمهرِي بالترتيب العربي. تخيّل عدّ منتجات في متجر."],
  ["speaking", 51, 60, "الأسعار والميزانية", "Prices and budgets", "اقرأ أسعاراً تدريبية من 51 إلى 60، ثم اكتب العدد الذي سمعته من شريكك. هذه قيم للتدريب وليست أسعاراً فعلية. ሃምሳ تعني خمسين وስልሳ تعني ستين."],
  ["travel", 61, 70, "الأعداد أثناء التنقّل", "Numbers while travelling", "تدرّب على أرقام حافلات أو تذاكر افتراضية من 61 إلى 70. اقرأ العدد كاملاً، ثم أعده للتأكد. لا تستخدم هذه القيم باعتبارها معلومات عن خطوط نقل حقيقية."],
  ["travel", 71, 80, "التذاكر والمصاريف", "Tickets and expenses", "ميّز بين سبعين وثمانين، واقرأ مبالغ تدريبية من 71 إلى 80. راجع الآحاد بعد قراءة العشرات. كوّن مع شريك قائمة مصروفات افتراضية بالأرقام التي تعلمتها."],
  ["professional", 81, 90, "الجرد والكميات في العمل", "Workplace inventory", "اقرأ كميات افتراضية من 81 إلى 90 في قائمة جرد. اكتب الرقم مقابل الكلمة الأمهرية، ثم تحقق من العشرات والآحاد كلٍّ على حدة. هذه مفردات عددية وليست صياغات مهنية كاملة."],
  ["professional", 91, 100, "من واحد وتسعين إلى مئة", "From ninety-one to one hundred", "أكمل العدّ حتى مئة: አንድ መቶ. راجع الفروق بين ዘጠኝ (تسعة) وዘጠና (تسعين). اقرأ كميات افتراضية في العمل، ثم راجع أعداداً عشوائية من صفر إلى مئة."],
] as const;

export const numberLessonInputs: LessonInput[] = modules.map(([course, from, to, ar, en, explanation]) => [
  `numbers-course-${from}-${to}`, course,
  `${ar}: ${from}–${to}`, `${en}: ${from}–${to}`,
  `${explanation} هذه كلمات الأعداد بالفيدل وليست رموز الأرقام الإثيوبية التقليدية. النطق العربي تقريبي، والمحتوى تجريبي بانتظار المراجعة اللغوية.`,
  Array.from({ length: to - from + 1 }, (_, i) => numberWord(from + i)),
]);
