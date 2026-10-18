import { useState } from "react";
import { View, TextInput, Platform } from "react-native";
import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Action, Txt, styles } from "@/components/LearningUI";
import { useColors } from "@/hooks/useColors";
WebBrowser.maybeCompleteAuthSession();

export default function SignInPage() {
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isSignedIn) return <Redirect href="/" />;
  const finish = async () => {
    const resource = register ? signUp : signIn;
    if (resource.status === "complete") {
      await resource.finalize({ navigate: ({ session }) => {
        if (session?.currentTask) { setError("يتطلب حسابك خطوة إضافية. أكملها من نسخة الويب."); return; }
        router.replace("/");
      } });
    }
  };
  const submit = async () => {
    setBusy(true); setError("");
    try {
      if (verify) {
        const result = register ? await signUp.verifications.verifyEmailCode({ code }) : await signIn.mfa.verifyEmailCode({ code });
        if (result.error) throw result.error;
        await finish();
      } else if (register) {
        const result = await signUp.password({ emailAddress: email.trim(), password });
        if (result.error) throw result.error;
        if (signUp.status === "complete") await finish();
        else {
          const result = await signUp.verifications.sendEmailCode();
          if (result.error) throw result.error;
          setVerify(true);
        }
      } else {
        const result = await signIn.password({ emailAddress: email.trim(), password });
        if (result.error) throw result.error;
        if (signIn.status === "complete") await finish();
        else if (signIn.status === "needs_client_trust") {
          const result = await signIn.mfa.sendEmailCode();
          if (result.error) throw result.error;
          setVerify(true);
        } else setError("يتطلب حسابك تحققاً إضافياً. أكمل تسجيل الدخول من نسخة الويب.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول. تحقّق من بياناتك."); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true); setError("");
    try {
      const result = await startSSOFlow({ strategy: "oauth_google", redirectUrl: AuthSession.makeRedirectUri() });
      if (result.createdSessionId) {
        await result.setActive?.({ session: result.createdSessionId, navigate: () => { router.replace("/"); } });
      } else if (result.authSessionResult?.type !== "cancel") setError("يلزم إكمال بيانات الحساب. استخدم البريد الإلكتروني أو نسخة الويب.");
    } catch { setError("تعذر الدخول عبر Google. جرّب البريد الإلكتروني."); }
    finally { setBusy(false); }
  };
  const inputStyle = { color: c.foreground, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, padding: 16, backgroundColor: c.card, fontSize: 16 };
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 26, paddingTop: Platform.OS === "web" ? 84 : insets.top + 30, paddingBottom: 60, gap: 20 }} bottomOffset={40} keyboardShouldPersistTaps="handled">
    <Txt style={{ color: c.primary, letterSpacing: 3 }}>ETHIO HUDHUD</Txt>
    <Txt style={[styles.fidel, { paddingVertical: 24, color: c.primary }]}>ሰላም</Txt>
    <Txt style={styles.heading}>{verify ? "تحقّق من بريدك" : register ? "ابدأ رحلتك مع هدهد" : "مرحباً بعودتك"}</Txt>
    <Txt>تعلّم الأمهرية، خطوة بخطوة.</Txt>
    {verify ? <TextInput accessibilityLabel="رمز التحقق" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="رمز التحقق" placeholderTextColor={c.mutedForeground} style={inputStyle} /> : <>
      <Txt>البريد الإلكتروني</Txt><TextInput accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={c.mutedForeground} style={inputStyle} />
      <Txt>كلمة المرور</Txt><TextInput accessibilityLabel="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry style={inputStyle} />
    </>}
    {error ? <Txt style={{ color: c.destructive }}>{error}</Txt> : null}
    <Action title={busy ? "جارٍ المتابعة…" : verify ? "تأكيد" : register ? "إنشاء حساب" : "تسجيل الدخول"} onPress={() => void submit()} disabled={busy || (verify ? !code : !email || !password)} />
    {verify ? <Action title="إرسال رمز جديد" secondary disabled={busy} onPress={() => { void (register ? signUp.verifications.sendEmailCode() : signIn.mfa.sendEmailCode()).catch(() => setError("تعذر إرسال الرمز.")); }} /> : <>
      <Action title="المتابعة عبر Google" secondary onPress={() => void google()} disabled={busy} />
      <Action title={register ? "لديّ حساب بالفعل" : "إنشاء حساب جديد"} secondary onPress={() => { setRegister(!register); setError(""); }} />
      <Action title="نسيت كلمة المرور" secondary onPress={() => void WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}/sign-in`)} />
    </>}
    <View nativeID="clerk-captcha" />
    <Action title="العودة" secondary onPress={() => router.replace("/welcome")} />
  </KeyboardAwareScrollViewCompat>;
}
