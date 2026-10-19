import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { FavouriteButton } from "@/components/Favourites";
import { useGetLesson, getGetLessonQueryKey, getLessonPosition, useGetCourses, useCompleteLesson, type LessonResult } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, PronunciationNote, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
import { ConversationPractice } from "@/components/ConversationPractice";
export default function LessonPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LessonView key={id} id={id} />;
}
function LessonView({ id }: { id: string }) {
  const lesson = useGetLesson(id, { query: { queryKey: getGetLessonQueryKey(id), refetchOnWindowFocus: false, staleTime: Infinity } });
  const courses = useGetCourses();
  const position = courses.data ? getLessonPosition(courses.data, id) : null;
  const complete = useCompleteLesson();
  const qc = useQueryClient();
  const c = useColors();
  const [exerciseMode, setExerciseMode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LessonResult | null>(null);
  const [transliteration, setTransliteration] = useState(true);
  const active = useRef(0);
  const lastTouch = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      if (AppState.currentState === "active" && Date.now() - lastTouch.current < 60_000 && !result) active.current++;
    }, 1000);
    return () => clearInterval(t);
  }, [result]);
  const submit = () => {
    if (!lesson.data) return;
    complete.mutate({ id, data: { answers: lesson.data.exercises.map(e => answers[e.id]!), activeSeconds: Math.min(3600, active.current) } }, {
      onSuccess: data => { setResult(data); void qc.invalidateQueries(); },
    });
  };
  return <Screen title={lesson.data?.titleAr ?? "درسك اليوم"} subtitle={exerciseMode ? "اختبر فهمك" : "اقرأ، تذكّر، ثم جرّب."}>
    {lesson.isLoading ? <Loading /> : lesson.isError ? <Failure retry={lesson.refetch} /> : lesson.data && <View onTouchStart={() => { lastTouch.current = Date.now(); }} style={{ gap: 18 }}>
      <FavouriteButton id={id} />
      {position && <Card>
        <Txt>{position.stage.titleAr} · الشهر {position.course.month} · الأسبوع {position.week}</Txt>
        <Txt>الدرس {position.index + 1} / {position.total} · {position.completed} مكتمل</Txt>
        <Action title="الدرس السابق" secondary disabled={!position.previous} onPress={() => { if (position.previous) router.replace({ pathname: "/lesson/[id]", params: { id: position.previous.id } }); }} />
        <Action title="الدرس التالي" secondary disabled={!position.next} onPress={() => { if (position.next) router.replace({ pathname: "/lesson/[id]", params: { id: position.next.id } }); }} />
        <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>التصفح لا يُكمل الدرس. يتطلب الإنجاز اجتياز الاختبار بنسبة ٧٥٪.</Txt>
      </Card>}
      {result ? <>
        <Card><Txt style={[styles.heading, { color: c.primary, textAlign: "center" }]}>{result.score}%</Txt><Txt style={styles.subheading}>{result.passed ? "أحسنت! أكملت الدرس." : "خطوة أخرى وستتقنها"}</Txt><Txt>نقاط مكتسبة: {result.xpEarned}</Txt></Card>
        {result.feedback.map((f, i) => <Card key={i}><Txt style={{ color: f.correct ? c.primary : c.destructive }}>{f.correct ? "إجابة صحيحة" : "راجع هذه الإجابة"}</Txt><Txt>{f.explanation}</Txt></Card>)}
        <Action title="العودة إلى التعلّم" onPress={() => router.replace("/learn")} />
        {result.passed && position?.next && <Action title="متابعة إلى الدرس التالي" onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id: position.next!.id } })} />}
        {!result.passed && <Action title="حاول مرة أخرى" secondary onPress={() => { setAnswers({}); setResult(null); active.current = 0; void lesson.refetch(); }} />}
      </> : !exerciseMode ? <>
        <Card><Txt>{lesson.data.objective}</Txt><Txt>{lesson.data.explanation}</Txt></Card>
        <Action title={transliteration ? "إخفاء النطق بالعربية" : "إظهار النطق بالعربية"} secondary onPress={() => setTransliteration(!transliteration)} />
        {transliteration && <PronunciationNote />}
        {lesson.data.dialogue?.length ? <ConversationPractice key={id} turns={lesson.data.dialogue} showPronunciation={transliteration} />
          : lesson.data.words.map(w => <Card key={w.id}><Txt style={styles.fidel}>{w.amharic}</Txt><Txt style={{ textAlign: "center", fontSize: 19 }}>{w.arabic}</Txt>{transliteration && <Txt style={{ textAlign: "center", writingDirection: "rtl", fontSize: 18, color: c.mutedForeground }}>{w.transliteration}</Txt>}</Card>)}
        <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>الصوت غير متاح حالياً. لا يتم تقديم تقييم للنطق دون خدمة معتمدة.</Txt>
        <Action title="أنا مستعدّ للاختبار" onPress={() => setExerciseMode(true)} icon="arrow-left" />
      </> : <>
        {lesson.data.exercises.map((e, i) => <Card key={e.id}><Txt style={styles.subheading}>{i + 1}. {e.prompt}</Txt>{e.options.map((opt, index) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: answers[e.id] === index }} key={index} onPress={() => setAnswers(prev => ({ ...prev, [e.id]: index }))} style={{ backgroundColor: answers[e.id] === index ? c.secondary : c.background, padding: 16, borderRadius: c.radius, borderWidth: 1, borderColor: answers[e.id] === index ? c.primary : c.border }}><Txt>{opt}</Txt></Pressable>)}</Card>)}
        {complete.isError && <Txt style={{ color: c.destructive }}>تعذر إرسال الإجابات. حاول مجدداً.</Txt>}
        <Action title={complete.isPending ? "جارٍ التصحيح…" : "تحقّق من الإجابات"} onPress={submit} disabled={complete.isPending || lesson.data.exercises.some(e => answers[e.id] === undefined)} />
      </>}
    </View>}
  </Screen>;
}
