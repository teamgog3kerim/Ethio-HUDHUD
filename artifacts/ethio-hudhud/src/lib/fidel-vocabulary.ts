import type { Word } from '@workspace/api-client-react';

export type FidelExample = {
  id: string;
  amharic: string;
  arabic: string;
  english: string;
  transliteration: string;
  lessonId?: string;
  reviewStatus?: 'pilot';
};

type CourseExample = {
  lessonId: string;
  word: Pick<Word, 'id' | 'amharic' | 'arabic' | 'english' | 'transliteration'>;
};

// Reading supplements, not graded lessons or reviewed audio. Arabic spellings
// approximate sounds that do not all have exact Arabic equivalents.
const vocabulary: readonly (readonly [string, string, string, string])[] = [
  ['ሀገር', 'هَگَر', 'بلد', 'Country'],
  ['ሀብት', 'هَبْت', 'ثروة', 'Wealth'],
  ['ሁለት', 'هُلَت', 'اثنان', 'Two'],
  ['ሂሳብ', 'هِساب', 'حساب', 'Bill / calculation'],
  ['ሆድ', 'هود', 'بطن', 'Stomach'],
  ['ሆቴል', 'هوتيل', 'فندق', 'Hotel'],
  ['ልጅ', 'لِج', 'طفل', 'Child'],
  ['ልብ', 'لِب', 'قلب', 'Heart'],
  ['ልብስ', 'لِبْس', 'ملابس', 'Clothes'],
  ['ሌሊት', 'ليليت', 'ليل', 'Night'],
  ['ሎሚ', 'لومي', 'ليمون', 'Lemon'],
  ['ሐኪም', 'هاكيم', 'طبيب', 'Doctor'],
  ['ሐሙስ', 'هامُس', 'الخميس', 'Thursday'],
  ['ሐሳብ', 'هَساب', 'فكرة', 'Idea'],
  ['ሕይወት', 'هِيوَت', 'حياة', 'Life'],
  ['ሕፃን', 'هِتْسان', 'رضيع', 'Infant'],
  ['መጽሐፍ', 'مَتْسْحَف', 'كتاب', 'Book'],
  ['መኪና', 'مَكينا', 'سيارة', 'Car'],
  ['ምግብ', 'مِگِب', 'طعام', 'Food'],
  ['ምሳ', 'مِسّا', 'غداء', 'Lunch'],
  ['ማር', 'مار', 'عسل', 'Honey'],
  ['ሙዝ', 'موز', 'موز', 'Banana'],
  ['ማን', 'مان', 'مَن؟', 'Who?'],
  ['ሥራ', 'سِرا', 'عمل', 'Work'],
  ['ሥጋ', 'سِگا', 'لحم', 'Meat'],
  ['ሥዕል', 'سِئِل', 'صورة أو رسم', 'Picture / drawing'],
  ['ሥር', 'سِر', 'جذر', 'Root'],
  ['ሠላሳ', 'سَلاسا', 'ثلاثون', 'Thirty'],
  ['ራስ', 'راس', 'رأس', 'Head'],
  ['ሩዝ', 'روز', 'أرز', 'Rice'],
  ['ሮዝ', 'روز', 'وردي', 'Pink'],
  ['ረጅም', 'رَجِم', 'طويل', 'Long / tall'],
  ['ሰው', 'سَو', 'شخص', 'Person'],
  ['ሰላም', 'سَلام', 'سلام؛ مرحباً', 'Peace / hello'],
  ['ስም', 'سِم', 'اسم', 'Name'],
  ['ስልክ', 'سِلْك', 'هاتف', 'Phone'],
  ['ሰዓት', 'سَأَت', 'ساعة', 'Clock / hour'],
  ['ሰኞ', 'سَنيّو', 'الاثنين', 'Monday'],
  ['ሳሙና', 'سامونا', 'صابون', 'Soap'],
  ['ቀን', 'قَن', 'يوم', 'Day'],
  ['ቀይ', 'قَي', 'أحمر', 'Red'],
  ['ቁልፍ', 'قُلْف', 'مفتاح', 'Key'],
  ['ቅመም', 'قِمَم', 'بهارات', 'Spice'],
  ['ቀሚስ', 'قَميس', 'فستان', 'Dress'],
  ['ቤት', 'بيت', 'بيت', 'House'],
  ['በር', 'بَر', 'باب', 'Door'],
  ['ቡና', 'بونّا', 'قهوة', 'Coffee'],
  ['ብር', 'بِر', 'البِرّ الإثيوبي؛ نقود', 'Ethiopian birr / money'],
  ['ቦርሳ', 'بورسا', 'حقيبة', 'Bag'],
  ['ብርድ', 'بِرْد', 'برد', 'Cold'],
  ['ባህር', 'باهِر', 'بحر', 'Sea'],
  ['ተማሪ', 'تَماري', 'طالب', 'Student'],
  ['ትምህርት', 'تِمْهِرْت', 'تعليم', 'Education'],
  ['ትምህርት ቤት', 'تِمْهِرْت بيت', 'مدرسة', 'School'],
  ['ቲማቲም', 'تيماتيم', 'طماطم', 'Tomato'],
  ['ታክሲ', 'تاكسي', 'سيارة أجرة', 'Taxi'],
  ['ትኬት', 'تِكيت', 'تذكرة', 'Ticket'],
  ['ነገ', 'نَگَ', 'غداً', 'Tomorrow'],
  ['ነጭ', 'نَچّ', 'أبيض', 'White'],
  ['ንጉሥ', 'نِگوس', 'ملك', 'King'],
  ['ነፋስ', 'نَفاس', 'رياح', 'Wind'],
  ['ነብር', 'نَبِر', 'نمر', 'Leopard'],
  ['አባት', 'أبّات', 'أب', 'Father'],
  ['እናት', 'إِنّات', 'أم', 'Mother'],
  ['አንድ', 'أند', 'واحد', 'One'],
  ['እንጀራ', 'إِنْجَرا', 'خبز الإنجيرا', 'Injera flatbread'],
  ['አየር', 'أيَر', 'هواء', 'Air'],
  ['አበባ', 'أبَبا', 'زهرة', 'Flower'],
  ['አራት', 'أرات', 'أربعة', 'Four'],
  ['ከተማ', 'كَتَما', 'مدينة', 'City'],
  ['ኪስ', 'كيس', 'جيب', 'Pocket'],
  ['ክፍል', 'كِفِل', 'غرفة؛ فصل دراسي', 'Room / classroom'],
  ['ኩባያ', 'كُبّايّا', 'كوب', 'Cup'],
  ['ከበሮ', 'كَبَرو', 'طبل', 'Drum'],
  ['ኮፍያ', 'كوفيا', 'قبعة', 'Hat'],
  ['ውሃ', 'وُها', 'ماء', 'Water'],
  ['ወተት', 'وَتَت', 'حليب', 'Milk'],
  ['ወንበር', 'وَنبَر', 'كرسي', 'Chair'],
  ['ወር', 'وَر', 'شهر', 'Month'],
  ['ወርቅ', 'وَرْق', 'ذهب', 'Gold'],
  ['ውሻ', 'وُشّا', 'كلب', 'Dog'],
  ['ዓይን', 'آيْن', 'عين', 'Eye'],
  ['ዓሣ', 'آسّا', 'سمك', 'Fish'],
  ['ዓመት', 'آمَت', 'سنة', 'Year'],
  ['ዓለም', 'آلَم', 'عالم', 'World'],
  ['ዕድሜ', 'إِدْمي', 'عمر', 'Age'],
  ['ዓርብ', 'آرْب', 'الجمعة', 'Friday'],
  ['ዜና', 'زينا', 'أخبار', 'News'],
  ['ዘይት', 'زَيت', 'زيت', 'Oil'],
  ['ዝናብ', 'زِناب', 'مطر', 'Rain'],
  ['ዘፈን', 'زَفَن', 'أغنية', 'Song'],
  ['ዜሮ', 'زيرو', 'صفر', 'Zero'],
  ['የት', 'يَت', 'أين؟', 'Where?'],
  ['ይቅርታ', 'يِقِرْتا', 'عذراً', 'Sorry / excuse me'],
  ['ዳቦ', 'دابو', 'خبز', 'Bread'],
  ['ድመት', 'دِمّت', 'قطة', 'Cat'],
  ['ድንች', 'دِنِچ', 'بطاطس', 'Potato'],
  ['ደብተር', 'دَبتَر', 'دفتر', 'Notebook'],
  ['ዶሮ', 'دورّو', 'دجاج', 'Chicken'],
  ['ድምፅ', 'دِمْتْس', 'صوت', 'Sound'],
  ['ደስታ', 'دَسْتا', 'سعادة', 'Happiness'],
  ['ገበያ', 'گَبَيا', 'سوق', 'Market'],
  ['ገንዘብ', 'گَنزَب', 'نقود', 'Money'],
  ['ጎመን', 'گومَن', 'خضار ورقية', 'Collard greens'],
  ['ጉሮሮ', 'گورورو', 'حلق', 'Throat'],
  ['ግንባር', 'گِنبّار', 'جبهة', 'Forehead'],
  ['ጋዜጣ', 'گازيطا', 'صحيفة', 'Newspaper'],
  ['ጠረጴዛ', 'طَرَپّيزا', 'طاولة', 'Table'],
  ['ጤና', 'طينا', 'صحة', 'Health'],
  ['ጥርስ', 'طِرْس', 'سنّ', 'Tooth'],
  ['ጠዋት', 'طَوات', 'صباح', 'Morning'],
  ['ጥቁር', 'طِقور', 'أسود', 'Black'],
  ['ጥማት', 'طِمات', 'عطش', 'Thirst'],
  ['ጳጳስ', 'پاپّاس', 'أسقف؛ لقب ديني', 'Bishop; religious title'],
  ['ጴጥሮስ', 'پيطروس', 'بطرس؛ اسم علم', 'Peter; a personal name'],
  ['ጸሐይ', 'تْسَهاي', 'شمس', 'Sun'],
  ['ጸሎት', 'تْسَلوت', 'صلاة', 'Prayer'],
  ['ጽሑፍ', 'تْسِهوف', 'نص مكتوب', 'Written text'],
  ['ጽዳት', 'تْسِدّات', 'نظافة', 'Cleanliness'],
  ['ፈረስ', 'فَرَس', 'حصان', 'Horse'],
  ['ፍራፍሬ', 'فِرافْري', 'فاكهة', 'Fruit'],
  ['ፊት', 'فيت', 'وجه', 'Face'],
  ['ፍቅር', 'فِقِر', 'حب', 'Love'],
  ['ፎቶ', 'فوتو', 'صورة فوتوغرافية', 'Photograph'],
  ['ፋብሪካ', 'فابريكا', 'مصنع', 'Factory'],
  ['ፈተና', 'فَتَنا', 'امتحان', 'Exam'],
  ['ፓስፖርት', 'پاسپورت', 'جواز سفر', 'Passport'],
  ['ፖስታ', 'پوسْتا', 'بريد؛ ظرف', 'Post / envelope'],
  ['ፓርክ', 'پارْك', 'حديقة عامة', 'Park'],
  ['ፖሊስ', 'پوليس', 'شرطة', 'Police'],
  ['ፒያኖ', 'پيانو', 'بيانو', 'Piano'],
];

export const FIDEL_VOCABULARY: readonly FidelExample[] = vocabulary.map(
  ([amharic, transliteration, arabic, english]) => ({
    id: `fidel-${Array.from(amharic, c => c.codePointAt(0)!.toString(16)).join('-')}`,
    amharic, transliteration, arabic, english, reviewStatus: 'pilot',
  }),
);

function exampleKey(text: string) {
  return text.normalize('NFC').replace(/[።፣፤፥፦፧፨.,!?؛،؟]/gu, '').replace(/\s+/gu, ' ').trim();
}

export function buildFidelExamples(courseExamples: readonly CourseExample[] = []): FidelExample[] {
  const byText = new Map(FIDEL_VOCABULARY.map(word => [exampleKey(word.amharic), { ...word }]));
  // Prefer the real course entry and its lesson link when a supplement overlaps.
  for (const { word, lessonId } of courseExamples) {
    const key = exampleKey(word.amharic);
    if (!key) continue;
    byText.set(key, { ...word, lessonId });
  }
  return Array.from(byText.values());
}

export function examplesForLetter(examples: readonly FidelExample[], letter: string): FidelExample[] {
  if (!/^\p{Script=Ethiopic}$/u.test(letter) || !/\p{L}/u.test(letter)) return [];
  return examples.filter(word => word.amharic.includes(letter));
}

export function examplesForFamily(examples: readonly FidelExample[], base: number): FidelExample[] {
  if (!Number.isInteger(base) || base < 0x1200 || base > 0x1350) return [];
  return examples.filter(word => Array.from(word.amharic).some(ch => {
    const point = ch.codePointAt(0)!;
    return point >= base && point < base + 7;
  }));
}
