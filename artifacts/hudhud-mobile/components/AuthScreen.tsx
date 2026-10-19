import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "./KeyboardAwareScrollViewCompat";
import { Action, Card, Txt, styles } from "./LearningUI";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function message(error: unknown) {
  const e = error as { errors?: { longMessage?: string; message?: string }[]; message?: string };
  return e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || e?.message || "تعذرت المتابعة. تحقّق من بياناتك وحاول مجدداً.";
}

export function AuthScreen({ mode }: { mode: "in" | "up" }) {
  const register = mode === "up";
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const lock = useRef(false);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const finish = async () => {
    const resource = register ? signUp : signIn;
    if (resource.status !== "complete") {
      setError("لم يكتمل التحقق بعد. راجع الرمز، أو أكمل الخطوات الإضافية من نسخة الويب.");
      return;
    }
    const result = await resource.finalize({ navigate: ({ session }) => {
      if (session?.currentTask) {
        setError("يتطلب الحساب خطوة أمان إضافية. أكملها من نسخة الويب.");
        return;
      }
      router.replace(register ? "/account" : "/");
    } });
    if (result.error) throw result.error;
  };
  const sendCode = async () => {
    const result = register ? await signUp.verifications.sendEmailCode() : await signIn.mfa.sendEmailCode();
    if (result.error) throw result.error;
    setCooldown(30);
    setNotice("أُرسل رمز إلى بريدك. تحقّق أيضاً من الرسائل غير المرغوب فيها.");
  };
  const submit = () => run(async () => {
    if (verify) {
      const result = register ? await signUp.verifications.verifyEmailCode({ code: code.trim() }) : await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (result.error) throw result.error;
      await finish();
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("أدخل عنوان بريد إلكتروني صالحاً."); return; }
      const result = register ? await signUp.password({ emailAddress: email.trim(), password }) : await signIn.password({ emailAddress: email.trim(), password });
      if (result.error) throw result.error;
      if ((register ? signUp.status : signIn.status) === "complete") await finish();
      else if (register || signIn.status === "needs_client_trust") {
        await sendCode(); setVerify(true);
      } else setError("يلزم تحقق إضافي لهذا الحساب. أكمل تسجيل الدخول من نسخة الويب.");
    }
  });
  const google = () => run(async () => {
    const result = await startSSOFlow({ strategy: "oauth_google", redirectUrl: AuthSession.makeRedirectUri() });
    if (result.createdSessionId) await result.setActive?.({ session: result.createdSessionId, navigate: () => { router.replace(register ? "/account" : "/"); } });
    else if (result.authSessionResult?.type !== "cancel" && result.authSessionResult?.type !== "dismiss") setError("أكمل بيانات حسابك باستخدام البريد الإلكتروني أو نسخة الويب.");
  });
  const inputStyle = { color: c.foreground, borderColor: c.border, borderWidth: 1, borderRadius: c.radius, padding: 15, backgroundColor: c.background, fontSize: 16, textAlign: "left" as const, writingDirection: "ltr" as const };
  if (isSignedIn) return <Redirect href="/" />;
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 22, paddingTop: Platform.OS === "web" ? 50 : insets.top + 24, paddingBottom: 60 }} bottomOffset={40} keyboardShouldPersistTaps="handled">
    <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 18 }}>
      <Txt style={{ color: c.primary, letterSpacing: 2, fontSize: 13 }}>ETHIO HUDHUD · هدهد</Txt>
      <View style={{ flexDirection: "row-reverse", gap: 10 }}>
        <View style={{ flex: 1 }}><Action title="تسجيل الدخول" secondary={register} disabled={busy || verify} onPress={() => { if (register) router.replace("/sign-in"); }} /></View>
        <View style={{ flex: 1 }}><Action title="إنشاء حساب" secondary={!register} disabled={busy || verify} onPress={() => { if (!register) router.replace("/sign-up"); }} /></View>
      </View>
      <Card>
        <Txt accessibilityRole="header" style={styles.heading}>{verify ? "تحقّق من بريدك" : register ? "ابدأ رحلتك مع هدهد" : "مرحباً بعودتك"}</Txt>
        <Txt style={{ color: c.mutedForeground }}>{verify ? `أدخل الرمز المرسل إلى ${email.trim()}.` : register ? "حساب واحد لحفظ تعلّمك ومراجعاتك عبر أجهزتك." : "سجّل الدخول لمتابعة دروسك ومحفوظات حسابك."}</Txt>
        {verify ? <>
          <Txt>رمز التحقق</Txt>
          <TextInput testID="input-verification-code" accessibilityLabel="رمز التحقق" value={code} onChangeText={setCode} editable={!busy} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" style={inputStyle} onSubmitEditing={() => void submit()} />
        </> : <>
          <Txt>البريد الإلكتروني</Txt>
          <TextInput testID="input-auth-email" accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} onBlur={() => setEmailTouched(true)} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={c.mutedForeground} style={inputStyle} />
          {emailTouched && !!email && !emailValid && <Txt accessibilityRole="alert" style={{ color: c.destructive }}>أدخل عنوان بريد إلكتروني صالحاً.</Txt>}
          <Txt>كلمة المرور</Txt>
          <TextInput testID="input-auth-password" accessibilityLabel="كلمة المرور" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete={register ? "new-password" : "current-password"} textContentType={register ? "newPassword" : "password"} style={inputStyle} onSubmitEditing={() => void submit()} />
          <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onPress={() => setShowPassword(v => !v)}><Txt style={{ color: c.primary, fontSize: 13 }}>{showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}</Txt></Pressable>
          {register && <Txt style={{ fontSize: 12, color: c.mutedForeground }}>استخدم كلمة مرور قوية وفريدة. سيُطلب تأكيد بريدك إذا كان ذلك مطلوباً للحساب.</Txt>}
        </>}
        {!!error && <Txt accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: c.destructive }}>{error}</Txt>}
        {!!notice && <Txt accessibilityLiveRegion="polite" style={{ color: c.primary }}>{notice}</Txt>}
        <Action title={busy ? "جارٍ المتابعة…" : verify ? "تأكيد الرمز" : register ? "إنشاء حساب" : "تسجيل الدخول"} onPress={() => void submit()} disabled={busy || (verify ? !code.trim() : !emailValid || !password)} />
        {verify ? <Action title={cooldown ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إرسال رمز جديد"} secondary disabled={busy || cooldown > 0} onPress={() => void run(sendCode)} /> : <>
          <Txt style={{ textAlign: "center", color: c.mutedForeground, fontSize: 12 }}>أو</Txt>
          <Action title="المتابعة عبر Google" secondary onPress={() => void google()} disabled={busy} />
          {!register && <Action title="نسيت كلمة المرور؟ استعدها بأمان على الويب" secondary onPress={() => void run(async () => { await WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}/sign-in`); })} disabled={busy} />}
        </>}
        <View nativeID="clerk-captcha" />
      </Card>
      <Txt style={{ color: c.mutedForeground, fontSize: 12 }}>تقدّم الضيف ومحفوظاته منفصلة عن الحساب ولا تنتقل إليه تلقائياً. تسجيل الخروج لا يحذف بيانات حسابك.</Txt>
      <View style={{ flexDirection: "row-reverse", gap: 12 }}>
        <Pressable accessibilityRole="link" onPress={() => void run(async () => { await WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}/terms`); })}><Txt style={{ color: c.primary, fontSize: 12 }}>شروط الاستخدام</Txt></Pressable>
        <Pressable accessibilityRole="link" onPress={() => void run(async () => { await WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}/privacy`); })}><Txt style={{ color: c.primary, fontSize: 12 }}>سياسة الخصوصية</Txt></Pressable>
      </View>
      <Action title="متابعة كضيف على الويب" secondary disabled={busy} onPress={() => void run(async () => { await WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}/dashboard`); })} />
      <Action title="العودة إلى البداية" secondary disabled={busy} onPress={() => router.replace("/welcome")} />
    </View>
  </KeyboardAwareScrollViewCompat>;
}
