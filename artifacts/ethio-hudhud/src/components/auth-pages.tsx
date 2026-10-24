import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Redirect } from 'wouter';
import { SignIn, SignUp, useAuth } from '@clerk/react';
import { parsePlanChoice } from '@/lib/plan-choice';
import { paidPlanFromSearch, signInDestination, signUpDestination } from '@/lib/auth-flow';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Toggles } from '@/components/shell';
import { Skeleton } from '@/components/bits';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

// Only same-origin, in-app return targets are honoured.
function safeReturn(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('redirect_url');
    if (!raw) return null;
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    if (basePath && u.pathname !== basePath && !u.pathname.startsWith(basePath + '/')) return null;
    const p = stripBase(u.pathname);
    if (p.startsWith('/sign-in') || p.startsWith('/sign-up')) return null;
    return p + u.search + u.hash;
  } catch {
    return null;
  }
}

// Google first, prominent; Clerk still owns verification and terms.
const social = { options: { socialButtonsPlacement: 'top' as const, socialButtonsVariant: 'blockButton' as const } };

function ClerkSlot({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const { isLoaded } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const id = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(id);
  }, [isLoaded]);
  if (isLoaded) return <>{children}</>;
  if (slow) {
    return (
      <div role="alert" className="flex w-[440px] max-w-full flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center" data-testid="state-auth-error">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="font-semibold">{t('تعذّر تحميل خدمة الدخول', 'Could not load sign-in')}</p>
        <p className="text-sm text-muted-foreground">{t('تحقق من الاتصال ثم أعد المحاولة.', 'Check your connection and try again.')}</p>
        <button type="button" onClick={() => window.location.reload()} className="press inline-flex h-11 items-center gap-2 rounded-2xl border border-input bg-card px-5 text-sm font-semibold" data-testid="button-auth-retry">
          <RotateCw className="size-4" /> {t('إعادة المحاولة', 'Retry')}
        </button>
      </div>
    );
  }
  return (
    <div className="w-[440px] max-w-full space-y-3 rounded-3xl border border-border bg-card p-8" role="status" aria-label={t('جارٍ التحميل', 'Loading')} data-testid="state-auth-loading">
      <Skeleton className="mx-auto h-12 w-12" /><Skeleton className="mx-auto h-6 w-48" /><Skeleton className="h-11" /><Skeleton className="h-11" /><Skeleton className="h-11" />
    </div>
  );
}

function AuthFrame({ children, mode }: { children: ReactNode; mode: 'in' | 'up' }) {
  const { t } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const initial = useRef<boolean | null>(null);
  const plan = parsePlanChoice(new URLSearchParams(window.location.search).get('plan'));
  const planSearch = plan ? `?plan=${plan}` : '';
  if (isLoaded && initial.current === null) initial.current = !!isSignedIn;
  // Only bounce users who arrived already signed in; fresh sign-ups follow Clerk's own redirect.
  const paid = paidPlanFromSearch(window.location.search);
  const dest = paid ? signUpDestination(window.location.search) : safeReturn() ?? (mode === 'up' ? '/learn' : '/start');
  if (initial.current === true && isSignedIn) return <Redirect to={dest} replace />;

  const tab = (active: boolean) => cn('flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground');
  return (
    <div className="grain grid min-h-[100dvh] grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-deep p-10 text-[hsl(75_30%_96%)] lg:flex lg:flex-col lg:justify-between">
        <span aria-hidden className="am pointer-events-none absolute -bottom-24 end-[-3rem] select-none text-[30rem] font-extrabold leading-none text-white/[0.06]">ሁ</span>
        <Link href="/" className="flex items-center gap-3"><Logo size={48} /><span className="font-display text-xl font-extrabold">HUDHUD</span></Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-snug">{mode === 'in' ? t('أهلًا بعودتك. حروفك بانتظارك.', 'Welcome back. Your letters are waiting.') : t('احفظ تقدّمك في الفيدل.', 'Keep your Fidel progress safe.')}</h2>
          <p className="mt-3 max-w-sm text-white/70">{t('الحساب يحفظ دروسك ومراجعاتك على كل أجهزتك.', 'An account keeps your lessons and reviews on every device.')}</p>
        </div>
        <p className="relative text-sm text-white/60">{t('48 ساعة مجانًا بعد التسجيل بحساب Google.', '48 free hours after you sign up with Google.')}</p>
      </aside>
      <div className="relative flex min-w-0 w-full flex-col items-center gap-4 px-4 pb-8 pt-4 lg:justify-center lg:py-10">
        <div className="flex w-full max-w-[440px] items-center justify-between lg:absolute lg:end-4 lg:top-4 lg:max-w-none lg:w-auto">
          <Link href="/" className="flex items-center gap-2 lg:hidden" data-testid="link-brand-auth"><Logo size={36} /><span className="font-display text-lg font-extrabold">HUDHUD</span></Link>
          <Toggles />
        </div>
        <nav className="flex w-[440px] max-w-full gap-1 rounded-2xl border border-border bg-card p-1" aria-label={t('نوع الحساب', 'Account')}>
          <Link href={`/sign-in${planSearch}`} aria-current={mode === 'in' ? 'page' : undefined} className={tab(mode === 'in')} data-testid="tab-signin">{t('تسجيل الدخول', 'Sign in')}</Link>
          <Link href={`/sign-up${planSearch}`} aria-current={mode === 'up' ? 'page' : undefined} className={tab(mode === 'up')} data-testid="tab-signup">{t('إنشاء حساب', 'Create account')}</Link>
        </nav>
        <ClerkSlot>{children}</ClerkSlot>
        <p className="max-w-[440px] text-center text-xs text-muted-foreground">
          {t('بالمتابعة فأنت توافق على ', 'By continuing you agree to the ')}
          <Link href="/terms" className="underline" data-testid="link-terms-auth">{t('الشروط', 'Terms')}</Link>
          {t(' و', ' and ')}
          <Link href="/privacy" className="underline" data-testid="link-privacy-auth">{t('الخصوصية', 'Privacy')}</Link>.
        </p>
      </div>
    </div>
  );
}

export function SignInPage() {
  const forced = useRef(`${basePath}${paidPlanFromSearch(window.location.search) ? signInDestination(window.location.search) : safeReturn() ?? '/start'}`);
  const plan = useRef(parsePlanChoice(new URLSearchParams(window.location.search).get('plan')));
  const suffix = plan.current ? `?plan=${plan.current}` : '';
  return (
    <AuthFrame mode="in">
      <SignIn routing="path" path={`${basePath}/sign-in`} appearance={social} signUpUrl={`${basePath}/sign-up${suffix}`} fallbackRedirectUrl={`${basePath}/start`} forceRedirectUrl={forced.current} />
    </AuthFrame>
  );
}

export function SignUpPage() {
  const destination = useRef(signUpDestination(window.location.search));
  const plan = parsePlanChoice(new URLSearchParams(window.location.search).get('plan'));
  return (
    <AuthFrame mode="up">
      <SignUp routing="path" path={`${basePath}/sign-up`} appearance={social} signInUrl={`${basePath}/sign-in${plan ? `?plan=${plan}` : ''}`} forceRedirectUrl={`${basePath}${destination.current}`} />
    </AuthFrame>
  );
}
