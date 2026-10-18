import { useState } from "react";
import { FlatList, Platform, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useQueryClient } from "@tanstack/react-query";
import { useGetChat, useSendChat, useGetBillingStatus, getGetChatQueryKey, type ChatMessage } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Action, Card, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
export default function Tutor() {
  const c = useColors(); const inset = useSafeAreaInsets();
  const history = useGetChat(); const send = useSendChat(); const qc = useQueryClient();
  const billing = useGetBillingStatus();
  const [message, setMessage] = useState("");
  const [local, setLocal] = useState<ChatMessage[]>([]);
  const submit = () => {
    const text = message.trim();
    if (!text) return;
    setMessage("");
    setLocal([{ id: Date.now().toString(), role: "user", content: text, createdAt: new Date().toISOString() }]);
    send.mutate({ data: { message: text, scenario: "المحادثة اليومية" } }, {
      onSuccess: async reply => {
        setLocal(prev => [...prev, reply]);
        await qc.invalidateQueries({ queryKey: getGetChatQueryKey() });
        // Keep ephemeral replies when retention is disabled.
        if (qc.getQueryData<ChatMessage[]>(getGetChatQueryKey())?.some(m => m.id === reply.id)) setLocal([]);
      },
      onError: () => { setMessage(text); setLocal([]); },
    });
  };
  const messages = [...(history.data ?? []), ...local];
  return <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }} keyboardVerticalOffset={0}>
    <View style={{ paddingHorizontal: 22, paddingTop: Platform.OS === "web" ? 80 : inset.top + 16, paddingBottom: 14, borderBottomWidth: 1, borderColor: c.border }}><Txt style={styles.subheading}>المعلّم هدهد</Txt><Txt style={{ color: c.mutedForeground, fontSize: 13 }}>تدريب نصي بالأمهرية، وشرح بالعربية{billing.data?.dailyAiLimit !== undefined ? ` · ${billing.data.dailyAiLimit} طلباً / 24 ساعة` : ""}</Txt></View>
    <FlatList inverted data={[...messages].reverse()} keyExtractor={m => m.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }} renderItem={({ item }) => <Card style={{ backgroundColor: item.role === "user" ? c.secondary : c.card, marginLeft: item.role === "user" ? 32 : 0, marginRight: item.role === "assistant" ? 32 : 0 }}><Txt style={{ fontFamily: undefined }}>{item.content}</Txt></Card>} ListEmptyComponent={<Card><Txt style={styles.fidel}>ሰላም</Txt><Txt>أهلاً بك! اسألني عن التحيات أو الحروف أو جرب محادثة في مقهى.</Txt></Card>} ListHeaderComponent={send.isPending ? <Txt>هدهد يكتب…</Txt> : null} />
    {send.isError && <Txt style={{ padding: 15, color: c.destructive }}>المعلم غير متاح الآن، أو وصلت إلى حد الاستخدام. أعد المحاولة لاحقاً.</Txt>}
    <View style={{ padding: 16, paddingBottom: Platform.OS === "web" ? 118 : 92, gap: 10, backgroundColor: c.card }}>
      <TextInput accessibilityLabel="رسالتك للمعلّم" multiline value={message} onChangeText={setMessage} placeholder="اسأل هدهد…" placeholderTextColor={c.mutedForeground} maxLength={2000} style={{ backgroundColor: c.background, color: c.foreground, padding: 14, borderRadius: c.radius, textAlign: "right", maxHeight: 100 }} />
      <Action title="إرسال" icon="send" onPress={submit} disabled={send.isPending || !message.trim()} />
    </View>
  </KeyboardAvoidingView>;
}
