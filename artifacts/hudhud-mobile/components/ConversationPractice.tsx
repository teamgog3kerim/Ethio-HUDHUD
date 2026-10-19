import { useState } from "react";
import { Pressable, View } from "react-native";
import type { DialogueTurn } from "@workspace/api-client-react";
import { Card, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";

const speakerKey = (turn: DialogueTurn) => JSON.stringify([turn.speakerAr, turn.speakerEn]);

export function ConversationPractice({ turns, showPronunciation }: { turns: DialogueTurn[]; showPronunciation: boolean }) {
  const c = useColors();
  const [role, setRole] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const speakers = turns.filter((turn, i) => turns.findIndex(other => speakerKey(other) === speakerKey(turn)) === i);
  const chooseRole = (next: string | null) => { setRole(next); setRevealed(new Set()); };
  const buttonStyle = (selected = false) => ({
    padding: 12, borderRadius: c.radius, borderWidth: 1,
    borderColor: selected ? c.primary : c.border,
    backgroundColor: selected ? c.secondary : c.background,
  });

  return <Card testID="conversation-transcript">
    <Txt accessibilityRole="header" style={styles.subheading}>اقرأ المحادثة وتبادل الأدوار</Txt>
    <Txt>اختر متحدثاً لإخفاء ردوده، وجرّب الرد بنفسك قبل كشف كل رد. هذا تدريب ذاتي دون تقييم للنطق.</Txt>
    <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: role === null }} testID="button-dialogue-read-all"
        onPress={() => chooseRole(null)} style={buttonStyle(role === null)}>
        <Txt>قراءة الكل</Txt>
      </Pressable>
      {speakers.map((speaker, i) => <Pressable key={speakerKey(speaker)} accessibilityRole="button"
        accessibilityState={{ selected: role === speakerKey(speaker) }} testID={`button-practise-speaker-${i}`}
        onPress={() => chooseRole(speakerKey(speaker))} style={buttonStyle(role === speakerKey(speaker))}>
        <Txt>تدرّب بدور: {speaker.speakerAr}</Txt>
      </Pressable>)}
    </View>
    {role !== null && <Pressable accessibilityRole="button" testID="button-reset-dialogue"
      onPress={() => setRevealed(new Set())} style={buttonStyle()}>
      <Txt>إعادة التدريب وإخفاء الردود</Txt>
    </Pressable>}
    {turns.map((turn, i) => {
      const practising = role === speakerKey(turn);
      const visible = !practising || revealed.has(i);
      return <Card key={i} testID={`dialogue-turn-${i}`} style={{ backgroundColor: i % 2 ? c.secondary : c.background }}>
        <Txt style={{ color: c.primary, fontFamily: "IBMPlexSansArabic_600SemiBold" }}>{turn.speakerAr}</Txt>
        {practising && <Pressable accessibilityRole="button" accessibilityState={{ expanded: visible }}
          accessibilityLabel={`${visible ? "إخفاء الرد" : "كشف الرد"} ${i + 1}: ${turn.speakerAr}`}
          testID={`button-reveal-dialogue-${i}`} style={buttonStyle()}
          onPress={() => setRevealed(previous => {
            const next = new Set(previous);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
          })}>
          <Txt style={{ color: c.primary }}>{visible ? "إخفاء الرد" : "كشف الرد"}</Txt>
        </Pressable>}
        <View accessibilityLiveRegion="polite">
          {visible ? <>
            <Txt style={[styles.fidel, { fontSize: 25, lineHeight: 40 }]}>{turn.amharic}</Txt>
            {showPronunciation && <Txt testID={`dialogue-pronunciation-${i}`} style={{ writingDirection: "rtl", textAlign: "center", fontSize: 18, color: c.mutedForeground }}>{turn.transliteration}</Txt>}
            <Txt style={{ writingDirection: "rtl" }}>{turn.arabic}</Txt>
          </> : <Txt style={{ color: c.mutedForeground }}>دورك — حاول الرد ثم اكشف الجملة.</Txt>}
        </View>
      </Card>;
    })}
  </Card>;
}
