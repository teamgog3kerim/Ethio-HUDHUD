import { View } from "react-native";
import { router } from "expo-router";
import { useGetProfile, useGetProgress, useGetCourses } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
import { AnimatedHudhud } from "@/components/AnimatedHudhud";
import { CourseAccess } from "@/components/CourseAccess";
export default function Home() {
  const profile = useGetProfile(); const progress = useGetProgress(); const courses = useGetCourses(); const c = useColors();
  const next = courses.data?.flatMap(course => course.lessons).find(l => !l.completed);
  return <Screen title={`أهلاً، ${profile.data?.displayName ?? "صديق هدهد"}`} subtitle="لنقترب اليوم خطوة من الأمهرية.">
    <CourseAccess compact />
    <Card style={{ backgroundColor: c.primary, borderWidth: 0 }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}><View style={{ flex: 1 }}><Txt style={{ color: c.primaryForeground }}>كلمة تبدأ بها رحلتك</Txt><Txt style={[styles.fidel, { color: c.primaryForeground, textAlign: "right", marginVertical: 8 }]}>ሰላም</Txt><Txt style={{ color: c.primaryForeground }}>مرحباً · sälam</Txt></View><AnimatedHudhud size={100} radius={28} /></View>
    </Card>
    {!profile.data?.onboardingComplete && <Action title="خصّص رحلتك الدراسية" secondary icon="sliders" onPress={() => router.push("/account")} />}
    {progress.isLoading ? <Loading /> : progress.isError ? <Failure retry={progress.refetch} /> : progress.data && <Card>
      <Txt style={styles.subheading}>خطتك اليوم</Txt><Txt>{progress.data.todayMinutes} / {profile.data?.dailyGoal ?? 60} دقيقة</Txt>
      <View style={{ height: 9, borderRadius: 9, backgroundColor: c.secondary, overflow: "hidden" }}><View style={{ height: 9, backgroundColor: c.primary, width: `${Math.min(100, progress.data.todayMinutes / (profile.data?.dailyGoal ?? 60) * 100)}%` }} /></View>
      <Txt style={{ color: c.mutedForeground }}>{progress.data.streak} أيام متتالية · {progress.data.xp} نقطة مكتسبة</Txt>
    </Card>}
    {next && <Card><Txt style={{ color: c.primary }}>خطوتك التالية</Txt><Txt style={styles.subheading}>{next.titleAr}</Txt><Txt>{next.objective}</Txt><Action title="ابدأ الدرس" icon="arrow-left" onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: next.id } })} /></Card>}
    {courses.isError && <Failure retry={courses.refetch} />}
    <Action title="استكشف المسارات" secondary icon="book-open" onPress={() => router.push("/learn")} />
    <Action title="راجع كلماتك" secondary icon="layers" onPress={() => router.push("/review")} />
    <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>تعلّم الأمهرية بشرح عربي.</Txt>
  </Screen>;
}
