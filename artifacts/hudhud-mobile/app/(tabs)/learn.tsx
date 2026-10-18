import { router } from "expo-router";
import { useGetCourses } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
import { useState } from "react";
export default function Learn() {
  const query = useGetCourses();
  const c = useColors();
  const [conversationsOnly, setConversationsOnly] = useState(false);
  const total = query.data?.reduce((n, course) => n + course.lessons.length, 0);
  const conversations = query.data?.flatMap(course => course.lessons).filter(l => l.dialogue?.length).length ?? 0;
  return <Screen title="رحلتك في الأمهرية" subtitle="ستة مسارات للتعلّم، من الفيدل إلى العمل.">
    <Action title={conversationsOnly ? "عرض جميع الدروس" : `عرض المحادثات (${conversations})`} secondary icon="message-circle" onPress={() => setConversationsOnly(v => !v)} />
    {query.isLoading ? <Loading /> : query.isError ? <Failure retry={query.refetch} /> : query.data?.filter(course => !conversationsOnly || course.lessons.some(l => l.dialogue?.length)).map(course => <Card key={course.id}>
      <Txt style={{ color: c.primary }}>المسار {course.month.toLocaleString("ar")} · {course.completedCount}/{course.lessons.length}</Txt>
      <Txt style={styles.subheading}>{course.titleAr}</Txt><Txt>{course.description}</Txt>
      {course.lessons.filter(l => !conversationsOnly || l.dialogue?.length).map(l => <Action key={l.id} title={`${l.completed ? "مراجعة: " : ""}${l.titleAr}`} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: l.id } })} secondary={l.completed} icon={l.completed ? "check" : l.dialogue?.length ? "message-circle" : "arrow-left"} />)}
    </Card>)}
    {!query.isLoading && !query.isError && conversationsOnly && conversations === 0 && <Card><Txt>لا محادثات متاحة بعد.</Txt></Card>}
    {total !== undefined && <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>{total.toLocaleString("ar")} درساً، منها {conversations.toLocaleString("ar")} محادثات. المحتوى تجريبي وينتظر مراجعة لغوية قبل الاعتماد.</Txt>}
  </Screen>;
}
