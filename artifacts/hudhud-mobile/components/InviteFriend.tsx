import { useState } from "react";
import { Share, View, Pressable } from "react-native";
import { INVITE_APP_URL, INVITE_MESSAGES, getInviteText } from "@workspace/api-client-react";
import { Action, Card, Txt } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";

export function InviteFriend() {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const share = async () => {
    setBusy(true);
    setError("");
    try {
      // Sharing always requires the learner to choose and confirm a recipient.
      await Share.share({ title: "Ethio HUDHUD", message: getInviteText(selected, "ar") });
    } catch {
      setError("تعذّر فتح المشاركة. يمكنك نسخ رابط التطبيق أدناه وإرساله بنفسك.");
    } finally {
      setBusy(false);
    }
  };
  return <Card>
    <Action title="دعوة صديق" icon="users" secondary onPress={() => { setExpanded(v => !v); setError(""); }} />
    {expanded && <View style={{ gap: 12 }}>
      <Txt>اختر رسالة وعدّلها في تطبيق المشاركة قبل إرسالها. تعلّما الأمهرية معاً.</Txt>
      {INVITE_MESSAGES.map((message, index) => <Pressable
        key={index}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected === index }}
        accessibilityLabel={message.ar}
        onPress={() => { setSelected(index); setError(""); }}
        style={{ padding: 12, borderWidth: 1, borderRadius: c.radius, borderColor: selected === index ? c.primary : c.border, backgroundColor: selected === index ? c.secondary : c.background }}
      ><Txt>{message.ar}</Txt></Pressable>)}
      <Txt selectable>{getInviteText(selected, "ar")}</Txt>
      <Action title={busy ? "جارٍ فتح المشاركة…" : "مشاركة الدعوة"} icon="share-2" disabled={busy} onPress={() => void share()} />
      {!!error && <Txt style={{ color: c.destructive }}>{error}</Txt>}
      <Txt selectable accessibilityLabel="رابط التطبيق">{INVITE_APP_URL}</Txt>
    </View>}
  </Card>;
}
