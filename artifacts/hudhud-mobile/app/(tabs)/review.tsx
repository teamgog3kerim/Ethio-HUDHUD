import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetVocabulary, useReviewVocabulary } from "@workspace/api-client-react";
import { Action, Card, Failure, Loading, PronunciationNote, Screen, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
export default function Review() {
  const query = useGetVocabulary();
  const review = useReviewVocabulary();
  const qc = useQueryClient();
  const c = useColors();
  const [revealed, setRevealed] = useState(false);
  const word = query.data?.find(w => w.due);
  const answer = (remembered: boolean) => {
    if (!word) return;
    review.mutate({ id: word.id, data: { remembered } }, { onSuccess: () => { setRevealed(false); void qc.invalidateQueries(); } });
  };
  return <Screen title="كل كلمة تُقرّبك" subtitle="مراجعة متباعدة، لتبقى الكلمات معك.">
    {query.isLoading ? <Loading /> : query.isError ? <Failure retry={query.refetch} /> : word ? <>
      <Txt style={{ color: c.primary }}>متبقّي للمراجعة: {query.data?.filter(w => w.due).length}</Txt>
      <Card style={{ paddingVertical: 48 }}><Txt style={[styles.fidel, { fontSize: 44 }]}>{word.amharic}</Txt>{revealed && <><Txt style={{ textAlign: "center", fontSize: 24 }}>{word.arabic}</Txt><Txt style={{ textAlign: "center", writingDirection: "rtl", fontSize: 18, color: c.mutedForeground }}>{word.transliteration}</Txt><PronunciationNote /></>}</Card>
      {!revealed ? <Action title="إظهار المعنى" onPress={() => setRevealed(true)} /> : <><Action title="تذكّرتها" icon="check" onPress={() => answer(true)} disabled={review.isPending} /><Action title="أحتاج مراجعتها" secondary onPress={() => answer(false)} disabled={review.isPending} /></>}
      {review.isError && <Txt style={{ color: c.destructive }}>لم تُحفظ المراجعة. أعد المحاولة.</Txt>}
    </> : <Card><Txt style={styles.subheading}>أنهيت مراجعة اليوم</Txt><Txt>أحسنت! ستعود الكلمات بحسب جدول مراجعتك.</Txt></Card>}
  </Screen>;
}
