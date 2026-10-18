import { router } from "expo-router";
import { useGetCourses } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
export default function Learn() {
  const query = useGetCourses();
  const c = useColors();
  return <Screen title="رحلتك في الأمهرية" subtitle="ستة مسارات للتعلّم، من الفيدل إلى العمل.">
    {query.isLoading ? <Loading /> : query.isError ? <Failure retry={query.refetch} /> : query.data?.map(course => <Card key={course.id}>
      <Txt style={{ color: c.primary }}>المسار {course.month.toLocaleString("ar")} · {course.completedCount}/{course.lessons.length}</Txt>
      <Txt style={styles.subheading}>{course.titleAr}</Txt><Txt>{course.description}</Txt>
      {course.lessons.map(l => <Action key={l.id} title={`${l.completed ? "مراجعة: " : ""}${l.titleAr}`} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: l.id } })} secondary={l.completed} icon={l.completed ? "check" : "arrow-left"} />)}
    </Card>)}
    <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>12 درساً تجريبياً. ليست منهجاً متقدماً مكتملاً؛ تنتظر مراجعة لغوية قبل الاعتماد.</Txt>
  </Screen>;
}
