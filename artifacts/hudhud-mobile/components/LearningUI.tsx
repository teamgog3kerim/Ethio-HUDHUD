import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextProps, type ViewProps } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { PropsWithChildren } from "react";

export function Txt({ style, ...props }: TextProps) {
  const c = useColors();
  return <Text {...props} style={[{ fontFamily: "IBMPlexSansArabic_400Regular", color: c.foreground, fontSize: 16, textAlign: "right", lineHeight: 27 }, style]} />;
}
export function PronunciationNote() {
  const c = useColors();
  return <Txt style={{ fontSize: 12, color: c.mutedForeground, writingDirection: "rtl" }}>
    النطق بالحروف العربية تقريبي وينتظر المراجعة اللغوية؛ بعض الأصوات والحركات لا مقابل دقيق لها في العربية. گ: جيم قاهرية، چ: تاء وشين متصلتان، پ: باء مهموسة.
  </Txt>;
}
export function Screen({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const c = useColors();
  const inset = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 22, gap: 18, paddingTop: Platform.OS === "web" ? 82 : inset.top + 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
    <View style={{ gap: 6 }}><Txt style={{ color: c.primary, letterSpacing: 2, fontSize: 12, textAlign: "right" }}>ETHIO HUDHUD</Txt><Txt style={styles.heading}>{title}</Txt>{subtitle && <Txt style={{ color: c.mutedForeground }}>{subtitle}</Txt>}</View>
    {children}
  </ScrollView>;
}
export function Card({ style, ...props }: ViewProps) {
  const c = useColors();
  return <View {...props} style={[{ backgroundColor: c.card, borderRadius: c.radius, padding: 20, gap: 12, borderColor: c.border, borderWidth: 1 }, style]} />;
}
export function Action({ title, onPress, disabled, secondary = false, icon }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: keyof typeof Feather.glyphMap }) {
  const c = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={() => { void Haptics.selectionAsync(); onPress(); }} style={({ pressed }) => ({ opacity: disabled ? .45 : pressed ? .7 : 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: c.radius, backgroundColor: secondary ? c.secondary : c.primary })}>
    {icon && <Feather name={icon} size={19} color={secondary ? c.secondaryForeground : c.primaryForeground} />}
    <Txt style={{ color: secondary ? c.secondaryForeground : c.primaryForeground, fontFamily: "IBMPlexSansArabic_600SemiBold" }}>{title}</Txt>
  </Pressable>;
}
export function Loading() { const c = useColors(); return <ActivityIndicator style={{ margin: 36 }} color={c.primary} />; }
export function Failure({ retry }: { retry: () => void }) { return <Card><Txt>تعذّر تحميل البيانات. تحقّق من الاتصال وحاول مجدداً.</Txt><Action title="إعادة المحاولة" onPress={retry} secondary icon="refresh-cw" /></Card>; }
export const styles = StyleSheet.create({
  heading: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 28, lineHeight: 44 },
  subheading: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 21, lineHeight: 35 },
  fidel: { fontFamily: "NotoSansEthiopic_400Regular", fontSize: 34, lineHeight: 52, textAlign: "center", writingDirection: "ltr" },
});
