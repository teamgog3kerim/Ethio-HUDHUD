import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Image, Platform, View } from "react-native";

const icon = require("@/assets/images/icon.png");
const body = require("@/assets/images/hudhud-body.png");
const crown = require("@/assets/images/hudhud-crown.png");

export function AnimatedHudhud({ size, radius }: { size: number; radius: number }) {
  const [reduce, setReduce] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => on && setReduce(v)).catch(() => {});
    const s = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    const a = AppState.addEventListener("change", st => setActive(st === "active"));
    return () => { on = false; s.remove(); a.remove(); };
  }, []);

  useEffect(() => {
    if (reduce || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    let anim: Animated.CompositeAnimation | null = null;
    const nd = Platform.OS !== "web";
    const step = (to: number, ms: number) => Animated.timing(t, { toValue: to, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: nd });
    const run = () => {
      anim = Animated.sequence([step(1, 420), step(-0.7, 360), step(0.5, 300), step(-0.3, 260), step(0, 380)]);
      anim.start(({ finished }) => { if (finished) timer = setTimeout(run, 3200 + Math.random() * 2800); });
    };
    timer = setTimeout(run, 1200);
    return () => { clearTimeout(timer); anim?.stop(); t.setValue(0); };
  }, [reduce, active, t]);

  const box = { width: size, height: size, borderRadius: radius, overflow: "hidden" as const };
  if (reduce) return <Image source={icon} style={box} accessibilityLabel="هدهد" />;
  const px = size * (620 / 1024 - 0.5), py = size * (350 / 1024 - 0.5);
  const rot = t.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });
  const nod = t.interpolate({ inputRange: [-1, 1], outputRange: [size * 0.004, -size * 0.004] });
  return (
    <View style={box} accessibilityLabel="هدهد" accessible>
      <Image source={body} style={{ width: size, height: size, position: "absolute" }} />
      <Animated.Image source={crown} style={{ width: size, height: size, position: "absolute", transform: [{ translateX: px }, { translateY: py }, { rotate: rot }, { translateY: -py }, { translateX: -px }, { translateY: nod }] }} />
    </View>
  );
}
