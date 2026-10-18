import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Logo } from '@/components/logo';
import { InstallPrompt } from '@/components/install-prompt';
import { Toggles } from '@/components/shell';
import { AppProvider, useApp } from '@/lib/app';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import Learn from '@/pages/learn';
import LessonPage from '@/pages/lesson';
import Fidel from '@/pages/fidel';
import Plan from '@/pages/plan';
import Review from '@/pages/review';
import Tutor from '@/pages/tutor';
import ProgressPage from '@/pages/progress';
import Onboarding from '@/pages/onboarding';
import Account from '@/pages/account';
import Premium from '@/pages/premium';
import { Privacy, Terms } from '@/pages/legal';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function buildAppearance(dark: boolean) {
  const card = dark ? '#10201b' : '#FBFCF8';
  const fg = dark ? '#EEF1E8' : '#0F2A23';
  const muted = dark ? '#A5B3AB' : '#4E6860';
  return {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: {
      logoPlacement: 'inside' as const,
      logoLinkUrl: basePath || '/',
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: dark ? '#3FA386' : '#176B55',
      colorForeground: fg,
      colorMutedForeground: muted,
      colorDanger: dark ? '#E57A68' : '#B3402F',
      colorBackground: card,
      colorInput: dark ? '#0B1613' : '#FFFFFF',
      colorInputForeground: fg,
      colorNeutral: dark ? '#C9D6CE' : '#104C3D',
      fontFamily: "'IBM Plex Sans Arabic', 'Noto Sans Ethiopic', sans-serif",
      borderRadius: '1rem',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      cardBox: `rounded-3xl w-[440px] max-w-full overflow-hidden border border-[#E6B85C]/60 shadow-xl`,
      card: '!shadow-none !border-0 !bg-transparent !rounded-none',
      footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
      headerTitle: { color: fg, fontFamily: "'Noto Kufi Arabic', sans-serif", fontWeight: 800 },
      headerSubtitle: { color: muted },
      socialButtonsBlockButtonText: { color: fg, fontWeight: 600 },
      formFieldLabel: { color: fg, fontWeight: 600 },
      footerActionLink: { color: dark ? '#E6B85C' : '#176B55', fontWeight: 700 },
      footerActionText: { color: muted },
      dividerText: { color: muted },
      identityPreviewEditButton: { color: dark ? '#E6B85C' : '#176B55' },
      formFieldSuccessText: { color: dark ? '#7fd1b3' : '#176B55' },
      alertText: { color: fg },
      logoBox: { height: '56px', justifyContent: 'center' },
      logoImage: { height: '56px' },
      formButtonPrimary: { backgroundColor: dark ? '#3FA386' : '#176B55', color: dark ? '#06130f' : '#F7F8F5', fontWeight: 700, borderRadius: '1rem' },
    },
  };
}

function AuthFrame({ children, mode }: { children: ReactNode; mode: 'in' | 'up' }) {
  const { t } = useApp();
  return (
    <div className="grain grid min-h-[100dvh] bg-background lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-deep p-10 text-[hsl(75_30%_96%)] lg:flex lg:flex-col lg:justify-between">
        <span aria-hidden className="am pointer-events-none absolute -bottom-24 end-[-3rem] select-none text-[30rem] font-extrabold leading-none text-white/[0.06]">ሁ</span>
        <div className="flex items-center gap-3"><Logo size={48} /><span className="font-display text-xl font-extrabold">HUDHUD</span></div>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-snug">{mode === 'in' ? t('أهلًا بعودتك. حروفك بانتظارك.', 'Welcome back. Your letters are waiting.') : t('احفظ تقدّمك في الفيدل.', 'Keep your Fidel progress safe.')}</h2>
          <p className="mt-3 max-w-sm text-white/70">{t('الحساب يحفظ دروسك ومراجعاتك على كل أجهزتك.', 'An account keeps your lessons and reviews on every device.')}</p>
        </div>
        <p className="relative text-sm text-white/50">{t('محتوى تجريبي بانتظار المراجعة', 'Pilot content awaiting review')}</p>
      </aside>
      <div className="relative flex flex-col items-center justify-center gap-4 px-4 py-10">
        <div className="absolute end-4 top-4"><Toggles /></div>
        <div className="lg:hidden" />
        {children}
        <a href={basePath || '/'} className="text-sm text-muted-foreground underline" data-testid="link-continue-guest">{t('أو تابع كضيف', 'Or continue as a guest')}</a>
      </div>
    </div>
  );
}

function SignInPage() {
  return <AuthFrame mode="in"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}
function SignUpPage() {
  return <AuthFrame mode="up"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { dark, lang } = useApp();
  const appearance = useMemo(() => buildAppearance(dark), [dark]);
  const ar = lang === 'ar';
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: ar ? 'أهلًا بعودتك' : 'Welcome back', subtitle: ar ? 'سجّل الدخول لمتابعة تعلّمك' : 'Sign in to continue learning' } },
        signUp: { start: { title: ar ? 'أنشئ حسابك' : 'Create your account', subtitle: ar ? 'احفظ تقدّمك في الأمهرية' : 'Keep your Amharic progress' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/learn" component={Learn} />
          <Route path="/lesson/:id" component={LessonPage} />
          <Route path="/fidel" component={Fidel} />
          <Route path="/plan" component={Plan} />
          <Route path="/review" component={Review} />
          <Route path="/tutor" component={Tutor} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/account" component={Account} />
          <Route path="/premium" component={Premium} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <Toaster />
          <InstallPrompt />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
