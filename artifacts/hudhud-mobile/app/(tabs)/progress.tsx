import { Share } from "react-native";
import { useGetProgress, useGetStudyPlan } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
export default function Progress() {
  const query = useGetProgress(); const plan = useGetStudyPlan(); const c = useColors();
  return <Screen title="خطوات صغيرة، تقدّم حقيقي" subtitle="إنجازاتك مبنية على نشاطك الفعلي.">
    {query.isLoading ? <Loading /> : query.isError ? <Failure retry={query.refetch} /> : query.data && <>
      <Card><Txt style={{ color: c.primary }}>رحلتك حتى الآن</Txt><Txt style={[styles.heading, { fontSize: 44, lineHeight: 60 }]}>{query.data.lessonsCompleted} / {query.data.totalLessons}</Txt><Txt>دروس مكتملة</Txt></Card>
      <Card><Txt style={styles.subheading}>{query.data.streak} أيام متتالية</Txt><Txt>{query.data.totalMinutes} دقيقة تعلّم · {query.data.xp} نقطة</Txt><Txt>{query.data.vocabularyLearned} كلمة تعلّمتها · متوسط النتيجة {query.data.averageScore}%</Txt></Card>
      <Action title="شارك إنجازك" secondary icon="share-2" onPress={() => { void Share.share({ message: `أتعلم الأمهرية مع Ethio HUDHUD. أكملت ${query.data!.lessonsCompleted} دروس واكتسبت ${query.data!.xp} نقطة!` }); }} />
      <Txt style={styles.subheading}>خطة الستة أشهر</Txt>
      {[1, 2, 3, 4, 5, 6].map(month => <Card key={month}><Txt style={{ color: c.primary }}>الشهر {month}</Txt><Txt>{plan.data?.find(d => d.month === month)?.title ?? "جارٍ تحميل الخطة…"}</Txt><Txt style={{ color: c.mutedForeground }}>30 يوماً من الدروس والمراجعة والتطبيق. تتوسع المكتبة بعد مراجعة المحتوى.</Txt></Card>)}
    </>}
  </Screen>;
}
