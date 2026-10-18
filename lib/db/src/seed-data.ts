// Pilot content, not represented as professionally reviewed or native-speaker approved.
import { arabicLessonContent, arabicLearningText, arabicPronunciation } from "./pronunciation";
import { extraLessonInputs, conversationLessonInputs } from "./extra-curriculum";
export type SeedWord = { id: string; amharic: string; arabic: string; english: string; transliteration: string; due: boolean; interval: number };
export type SeedExercise = { id: string; prompt: string; options: string[]; type: string };
export type LessonContent = {
  titleAr: string; titleEn: string; titleAm: string; minutes: number;
  objective: string; explanation: string; words: SeedWord[]; exercises: SeedExercise[];
  dialogue?: { speakerAr: string; speakerEn: string; amharic: string; arabic: string; transliteration: string }[];
};
export type WordTuple = [string, string, string, string];
export type LessonInput = [string, string, string, string, string, WordTuple[]];
const makeWord = (w: WordTuple): SeedWord => ({
  id: Buffer.from(w[0]).toString("hex"), amharic: w[0], arabic: arabicLearningText(w[1]),
  english: w[2], transliteration: arabicPronunciation(w[3]), due: true, interval: 0,
});
export const courseSeed = [
  { id: "fidel", titleAr: "الفيدل وأصوات الأمهرية", titleEn: "Fidel & pronunciation", description: "تعرّف على حروف الفيدل واقرأ كلماتك الأولى.", level: "beginner", category: "fidel", month: 1 },
  { id: "everyday", titleAr: "المحادثة اليومية", titleEn: "Everyday conversation", description: "ابدأ التحية وقدّم نفسك بثقة.", level: "beginner", category: "conversation", month: 2 },
  { id: "reading", titleAr: "القراءة والكتابة", titleEn: "Reading & writing", description: "اقرأ الأعداد والكلمات الأساسية من حولك.", level: "beginner", category: "reading", month: 3 },
  { id: "speaking", titleAr: "التواصل العملي", titleEn: "Practical communication", description: "مفردات مفيدة للسؤال والحديث عن يومك.", level: "intermediate", category: "speaking", month: 4 },
  { id: "travel", titleAr: "السفر والثقافة الإثيوبية", titleEn: "Travel & Ethiopian culture", description: "كلمات للمطاعم والتنقل واكتشاف إثيوبيا.", level: "intermediate", category: "travel", month: 5 },
  { id: "professional", titleAr: "الأمهرية في العمل", titleEn: "Amharic at work", description: "مفردات العمل والأوقات للتواصل المهني.", level: "intermediate", category: "work", month: 6 },
];
const inputs: LessonInput[] = [
  ["fidel-ha", "fidel", "عائلة الحرف ሀ", "The ሀ letter family", "تعرّف على أشكال الحرف الأساسية. الحروف هنا مقاطع صوتية وليست حروفاً عربية؛ النقل اللاتيني تقريب مساعد وليس بديلاً عن سماع متحدث مؤهل.", [
    ["ሀ", "المقطع hä", "syllable hä", "hä"], ["ሁ", "المقطع hu", "syllable hu", "hu"], ["ሂ", "المقطع hi", "syllable hi", "hi"], ["ሃ", "المقطع ha", "syllable ha", "ha"], ["ሄ", "المقطع he", "syllable he", "he"], ["ህ", "المقطع hə", "syllable hə", "hə"], ["ሆ", "المقطع ho", "syllable ho", "ho"],
  ]],
  ["fidel-la", "fidel", "عائلة الحرف ለ", "The ለ letter family", "قارن بين عائلة ሀ وعائلة ለ. يتغير شكل المقطع بحسب الحركة. اقرأ الفيدل من اليسار إلى اليمين. الرمز ä يعبّر تقريبياً عن صوت مركزي ولا يطابق حركة عربية تماماً.", [
    ["ለ", "المقطع lä", "syllable lä", "lä"], ["ሉ", "المقطع lu", "syllable lu", "lu"], ["ሊ", "المقطع li", "syllable li", "li"], ["ላ", "المقطع la", "syllable la", "la"], ["ሌ", "المقطع le", "syllable le", "le"], ["ል", "المقطع lə", "syllable lə", "lə"], ["ሎ", "المقطع lo", "syllable lo", "lo"],
  ]],
  ["greetings", "everyday", "أول كلمة: مرحباً", "Your first hello", "ሰላም تحية شائعة تعني السلام وتُستخدم بمعنى مرحباً. አመሰግናለሁ تعني أشكرك. تعلّم العبارات كاملة بدلاً من استبدال كلماتها دون فهم السياق.", [
    ["ሰላም", "مرحباً / سلام", "hello / peace", "sälam"], ["አመሰግናለሁ", "شكراً", "thank you", "amäsäggənallähu"], ["እሺ", "حسناً", "okay", "əši"], ["ደህና", "بخير", "well / fine", "dähna"],
  ]],
  ["introductions", "everyday", "أنا وأنت", "Me and you", "እኔ ضمير المتكلم (أنا)، وአንተ للمخاطب المذكر، وአንቺ للمخاطبة المؤنثة. لا تستخدم ضميراً مكان الآخر دون مراعاة المخاطَب. ስም اسم بمعنى اسم.", [
    ["እኔ", "أنا", "I / me", "əne"], ["አንተ", "أنتَ", "you (male)", "antä"], ["አንቺ", "أنتِ", "you (female)", "anči"], ["ስም", "اسم", "name", "səm"],
  ]],
  ["numbers", "reading", "الأعداد من واحد إلى خمسة", "Numbers one to five", "تُكتب الأمهرية من اليسار إلى اليمين. اقرأ العدد بالكلمة ثم حاول تذكر معناه دون النظر إلى النقل اللاتيني. هذه الكلمات للأعداد وليست رموز نظام الأرقام الإثيوبي.", [
    ["አንድ", "واحد", "one", "and"], ["ሁለት", "اثنان", "two", "hulätt"], ["ሶስት", "ثلاثة", "three", "sost"], ["አራት", "أربعة", "four", "arat"], ["አምስት", "خمسة", "five", "aməst"],
  ]],
  ["family", "reading", "اقرأ كلمات العائلة", "Reading family words", "اقرأ الكلمة كاملة ولا تعتمد على شكل حرف واحد. ቤት تعني بيتاً، وቤተሰብ تعني العائلة. التشابه البصري يساعد الذاكرة لكنه لا يكفي لاستنتاج معنى كلمة جديدة.", [
    ["እናት", "أم", "mother", "ənnat"], ["አባት", "أب", "father", "abbat"], ["ቤተሰብ", "عائلة", "family", "betäsäb"], ["ቤት", "بيت", "house", "bet"],
  ]],
  ["questions", "speaking", "كلمات السؤال", "Question words", "تعلّم كلمات الاستفهام كأدوات داخل الجملة. ማን للسؤال عن الشخص، وምን عن الشيء، وየት عن المكان، وመቼ عن الوقت. ترتيب الكلمات في الأمهرية يختلف عن العربية.", [
    ["ማን", "مَن", "who", "man"], ["ምን", "ماذا", "what", "mən"], ["የት", "أين", "where", "yät"], ["መቼ", "متى", "when", "mäče"],
  ]],
  ["daily-time", "speaking", "الحديث عن الوقت", "Talking about time", "استخدم كلمات الوقت لتحديد سياق الحديث. ዛሬ اليوم، وነገ غداً، وትናንት أمس. تحديد الزمن وحده لا يغيّر صيغة الفعل؛ صيغ الأفعال تحتاج إلى دراسة منفصلة.", [
    ["ዛሬ", "اليوم", "today", "zare"], ["ነገ", "غداً", "tomorrow", "nägä"], ["ትናንት", "أمس", "yesterday", "tənant"], ["አሁን", "الآن", "now", "ahun"],
  ]],
  ["coffee-food", "travel", "في المقهى", "At the café", "ቡና تعني القهوة، وውሃ الماء. للقهوة مكانة اجتماعية مهمة في إثيوبيا، لكن العادات تختلف بين البيوت والمناطق. هذه مفردات وليست حوار طلب كامل.", [
    ["ቡና", "قهوة", "coffee", "buna"], ["ውሃ", "ماء", "water", "wəha"], ["ሻይ", "شاي", "tea", "šay"], ["እንጀራ", "إنجيرا", "injera", "ənjära"], ["ምግብ", "طعام", "food", "məgəb"],
  ]],
  ["transport", "travel", "التنقل في المدينة", "Getting around", "تعرّف على أسماء أماكن ووسائل تنقل شائعة. ታክሲ كلمة مستخدمة للتكسي. عند السفر تأكد من الوجهة والسعر بوضوح، ولا تفترض أن مفردة منفردة تكفي لطلب الاتجاهات.", [
    ["ታክሲ", "تاكسي", "taxi", "taksi"], ["መኪና", "سيارة", "car", "mäkina"], ["ሆቴል", "فندق", "hotel", "hotel"], ["መንገድ", "طريق", "road", "mängäd"],
  ]],
  ["work", "professional", "مفردات مكان العمل", "Workplace vocabulary", "تعلّم أسماء أساسية يمكنك التعرّف عليها في سياق مهني. ሥራ تعني العمل وقد تظهر كتابتها الشائعة ስራ. لا تحمل هذه المفردات وحدها معنى زمنياً أو طلباً كاملاً.", [
    ["ሥራ", "عمل", "work", "səra"], ["ቢሮ", "مكتب", "office", "biro"], ["ስብሰባ", "اجتماع", "meeting", "səbsäba"], ["ሰዓት", "ساعة / وقت", "hour / time", "säʿat"],
  ]],
  ["days", "professional", "أيام أسبوع العمل", "The working week", "هذه أسماء أيام الأسبوع من الاثنين إلى الجمعة. عند ترتيب اجتماع، تأكد أيضاً من التاريخ والمنطقة الزمنية ونظام حساب الوقت المستخدم؛ لا تفترض أن كلمة اليوم وحدها تمنع الالتباس.", [
    ["ሰኞ", "الاثنين", "Monday", "säñño"], ["ማክሰኞ", "الثلاثاء", "Tuesday", "maksäñño"], ["ረቡዕ", "الأربعاء", "Wednesday", "räbuʿ"], ["ሐሙስ", "الخميس", "Thursday", "hamus"], ["ዓርብ", "الجمعة", "Friday", "arb"],
  ]],
];
const allInputs: LessonInput[] = [
  ...inputs, ...extraLessonInputs,
  ...conversationLessonInputs.map(c => [
    c.id, c.courseId, c.titleAr, c.titleEn, c.explanation, c.turns.map(t => t[2]),
  ] satisfies LessonInput),
];
export const lessonSeed = allInputs.map(([id, courseId, titleAr, titleEn, explanation, rawWords], n) => {
  const words = rawWords.map(makeWord);
  const conversation = conversationLessonInputs.find(c => c.id === id);
  const answers = words.slice(0, 4).map((w, i) => {
    const options = words.slice(0, 4).map(v => v.arabic);
    // Rotate options so the answer is not always in the same position.
    const rotated = [...options.slice(i % 3), ...options.slice(0, i % 3)];
    return { exercise: { id: `${id}-${i}`, prompt: `ما معنى ${w.amharic}؟`, options: rotated, type: courseId === "fidel" ? "fidel" : "vocabulary" }, correctIndex: rotated.indexOf(w.arabic), explanation: `${w.amharic} تعني ${w.arabic}. النقل التقريبي: ${w.transliteration}.` };
  });
  return {
    id, courseId, sequence: n + 1, reviewStatus: "pilot",
    content: arabicLessonContent({
      titleAr, titleEn, titleAm: words[0]!.amharic, minutes: 10,
      objective: conversation ? "اقرأ الحوار، ثم تبادل الأدوار واختبر فهمك لمعاني جمله." : `تعرّف على ${words.length} مفردات أو مقاطع جديدة واختبر فهمك.`,
      explanation, words, exercises: answers.map(a => a.exercise),
      ...(conversation ? { dialogue: conversation.turns.map(([speakerAr, speakerEn, word]) => ({
        speakerAr, speakerEn, amharic: word[0], arabic: word[1], transliteration: word[3],
      })) } : {}),
    } satisfies LessonContent),
    answerKey: answers.map(a => ({ correctIndex: a.correctIndex, explanation: a.explanation })),
  };
});
