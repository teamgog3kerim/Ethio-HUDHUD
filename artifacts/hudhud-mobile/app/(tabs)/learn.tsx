import { router } from "expo-router";
import { buildLearningPath, learningStages, useGetCourses } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
import { useState } from "react";
import { FavouriteButton, SavedItems } from "@/components/Favourites";
export default function Learn() {
  const query = useGetCourses();
  const [savedView, setSavedView] = useState(false);
  const c = useColors();
  const [kind, setKind] = useState<"all" | "lessons" | "conversations">("all");
  const [month, setMonth] = useState<number | null>(null);
  const path = query.data ? buildLearningPath(query.data) : null;
  const suggested = path?.months.find(m => m.course.lessons.some(l => l.id === path.nextLesson?.id));
  const current = path?.months.find(m => m.course.month === month) ?? suggested ?? path?.months[0];
  const open = (id: string) => router.push({ pathname: "/lesson/[id]", params: { id } });
  return <Screen title="برنامج الأمهرية في ستة أشهر" subtitle="٢٤ أسبوعاً مقترحاً، بوتيرتك أنت. المراحل دراسية وليست شهادة طلاقة.">
    <Action title="البرنامج" secondary={savedView} onPress={() => setSavedView(false)} />
    <Action title="المحفوظات" icon="bookmark" secondary={!savedView} onPress={() => setSavedView(true)} />
    {savedView ? <SavedItems /> : query.isLoading ? <Loading /> : query.isError ? <Failure retry={query.refetch} /> : path && <>
      <Card>
        <Txt style={styles.subheading}>تقدمك في البرنامج</Txt>
        <Txt>{path.completed} / {path.total} مكتمل · {path.percent}%</Txt>
        <Txt>يُحسب الإنجاز عند اجتياز تمارين الدرس بنسبة ٧٥٪، لا بمجرد فتحه.</Txt>
        {path.nextLesson ? <Action title={`متابعة: ${path.nextLesson.titleAr}`} onPress={() => open(path.nextLesson!.id)} /> : <Txt>أكملت الدروس المتاحة. يمكنك العودة للمراجعة.</Txt>}
      </Card>
      {learningStages.map(stage => {
        const months = path.months.filter(m => m.stage.id === stage.id);
        const total = months.reduce((n, m) => n + m.total, 0);
        const completed = months.reduce((n, m) => n + m.completed, 0);
        return <Action key={stage.id} secondary={current?.stage.id !== stage.id} title={`${stage.titleAr} · الشهر ${stage.months.join("–")} · ${completed}/${total}`} onPress={() => setMonth(months[0]?.course.month ?? stage.months[0])} />;
      })}
      {current && <Card>
        <Txt style={{ color: c.primary }}>الشهر {current.course.month} · {current.stage.titleAr} · {current.completed}/{current.total}</Txt>
        <Txt style={styles.subheading}>{current.course.titleAr}</Txt><Txt>{current.course.description}</Txt>
        <Action secondary title="الشهر السابق" disabled={current.course.month <= 1} onPress={() => setMonth(current.course.month - 1)} />
        <Action secondary title="الشهر التالي" disabled={current.course.month >= 6} onPress={() => setMonth(current.course.month + 1)} />
        {(["all", "lessons", "conversations"] as const).map((value, i) => <Action key={value} title={["الكل", "الدروس", "المحادثات"][i]!} secondary={kind !== value} onPress={() => setKind(value)} />)}
        {current.weeks.map(week => {
          const lessons = week.lessons.filter(l => kind === "all" || (kind === "conversations" ? !!l.dialogue?.length : !l.dialogue?.length));
          return <Card key={week.number}><Txt style={{ color: c.primary }}>الأسبوع المقترح {week.number} / 24</Txt>
            {lessons.length ? lessons.map(l => <Card key={l.id}><Action title={`${l.completed ? "مكتمل · مراجعة: " : ""}${l.titleAr}`} onPress={() => open(l.id)} secondary={l.completed} icon={l.completed ? "check" : l.dialogue?.length ? "message-circle" : "arrow-left"} /><FavouriteButton id={l.id} /></Card>) : <Txt>لا مواد من هذا النوع في هذا الأسبوع؛ جرّب الكل.</Txt>}
          </Card>;
        })}
      </Card>}
      <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>راجع المفردات وتبادل أدوار المحادثة بين الجلسات. المحتوى تجريبي وينتظر مراجعة لغوية قبل الاعتماد.</Txt>
    </>}
  </Screen>;
}
