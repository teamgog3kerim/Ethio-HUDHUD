import React, { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useFonts, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { NotoSansEthiopic_400Regular } from '@expo-google-fonts/noto-sans-ethiopic';
import { ClerkProvider, ClerkLoaded, ClerkLoading, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

if (process.env.EXPO_PUBLIC_DOMAIN) setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
function Startup() {
  return <View style={{ flex: 1, backgroundColor: '#f6f7f3', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
    <ActivityIndicator size="large" color="#166a55" />
    <Text style={{ color: '#166a55', fontSize: 18 }}>ETHIO HUDHUD</Text>
  </View>;
}

function AuthBridge() {
  const { getToken, userId } = useAuth();
  const queryClient = useMemo(() => new QueryClient(), [userId]);
  setAuthTokenGetter(() => getToken());
  return <QueryClientProvider client={queryClient}><RootLayoutNav /></QueryClientProvider>;
}

function RootLayoutNav() {
  const c = useColors();
  return (
    <Stack screenOptions={{ headerBackTitle: 'رجوع', headerTintColor: c.primary, headerStyle: { backgroundColor: c.background }, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="lesson/[id]" options={{ title: 'خطوتك اليوم' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
    NotoSansEthiopic_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return Platform.OS === 'web' ? <Startup /> : null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache} proxyUrl={process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined}>
                <ClerkLoading><Startup /></ClerkLoading>
                <ClerkLoaded><AuthBridge /></ClerkLoaded>
              </ClerkProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
