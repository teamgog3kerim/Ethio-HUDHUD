import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk, useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, BookOpen, CalendarRange, Home, Languages, Layers, LogIn, LogOut, MessageCircle,
  Moon, ShieldCheck, Sparkles, Sun, UserRound, Type,
} from 'lucide-react';
import {
  getGetProfileQueryKey, useGetAdminAccess, useGetProfile, useSaveProfile, useGetPublicSettings,
} from '@workspace/api-client-react';
import { PlatformNotices } from '@/components/admin/notices';
import { Logo } from '@/components/logo';
import { useApp } from '@/lib/app';
import { toInput } from '@/lib/options';
import { cn } from '@/lib/utils';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Toggles({ className }: { className?: string }) {
  const { lang, setLang, dark, toggleDark, t } = useApp();
  const { data: profile } = useGetProfile();
  const qc = useQueryClient();
  const save = useSaveProfile({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetProfileQueryKey() }) },
  });
  const flip = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    if (profile) save.mutate({ data: { ...toInput(profile), language: next } });
  };
  const cls = 'press grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button type="button" onClick={flip} className={cn(cls, 'w-auto gap-1.5 px-3 text-sm font-semibold')} data-testid="button-lang" aria-label={t('تبديل اللغة', 'Switch language')}>
        <span className="flex items-center gap-1.5"><Languages className="size-4" />{lang === 'ar' ? 'EN' : 'عربي'}</span>
      </button>
      <button type="button" onClick={toggleDark} className={cls} data-testid="button-theme" aria-label={t('الوضع الداكن', 'Dark mode')}>
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}

export function Brand({ size = 40 }: { size?: number }) {
  const { t } = useApp();
  return (
    <Link href="/" className="flex items-center gap-2.5" data-testid="link-brand">
      <Logo size={size} />
      <span className="leading-none">
        <span className="font-display block text-lg font-extrabold tracking-wide">HUDHUD</span>
        <span className="am block text-[11px] text-muted-foreground">{t('هدهد · ሁድሁድ', 'Ethio · ሁድሁድ')}</span>
      </span>
    </Link>
  );
}

export function AuthButtons() {
  const { t } = useApp();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const qc = useQueryClient();
  if (isSignedIn) {
    return (
      <button
        type="button"
        data-testid="button-signout"
        onClick={() => { qc.clear(); void signOut({ redirectUrl: basePath || '/' }); }}
        className="press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <LogOut className="size-4" /> {t('تسجيل الخروج', 'Sign out')}
      </button>
    );
  }
  return (
    <Link href="/sign-in" data-testid="link-signin" className="press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
      <LogIn className="size-4" /> {t('تسجيل الدخول', 'Sign in')}
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const [loc] = useLocation();
  const { data: profile } = useGetProfile();
  const { data: access } = useGetAdminAccess();
  const isAdmin = access?.signedIn && (access.role === 'owner' || access.role === 'admin');
  const items = [
    { href: '/dashboard', icon: Home, label: t('الرئيسية', 'Home') },
    { href: '/learn', icon: BookOpen, label: t('الدروس', 'Learn') },
    { href: '/fidel', icon: Type, label: t('الفيدل', 'Fidel') },
    { href: '/review', icon: Layers, label: t('المراجعة', 'Review') },
    { href: '/tutor', icon: MessageCircle, label: t('المعلّم', 'Tutor') },
    { href: '/plan', icon: CalendarRange, label: t('الخطة', 'Plan') },
    { href: '/progress', icon: BarChart3, label: t('التقدّم', 'Progress') },
  ];
  const active = (h: string) => loc === h || loc.startsWith(h + '/');
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-card/70 p-4 backdrop-blur lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              data-testid={`nav-${i.href.slice(1)}`}
              className={cn(
                'press flex items-center gap-3 rounded-2xl px-4 py-3 font-medium',
                active(i.href) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <i.icon className="size-5" /> {i.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border pt-4">
          <Link href="/account" data-testid="nav-account" className={cn('press flex items-center gap-3 rounded-2xl px-4 py-3', active('/account') ? 'bg-secondary' : 'hover:bg-muted')}>
            <span className="grid size-9 place-items-center rounded-full bg-gold font-bold text-gold-foreground">
              {(profile?.displayName?.trim()[0] ?? '?').toUpperCase()}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block truncate font-semibold">{profile?.displayName || t('ضيف', 'Guest')}</span>
              <span className="block text-xs text-muted-foreground">{profile?.isGuest ? t('جلسة ضيف', 'Guest session') : t('حسابي', 'My account')}</span>
            </span>
          </Link>
          {isAdmin && (
            <Link href="/admin" data-testid="nav-admin" className={cn('press flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold', active('/admin') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted')}>
              <ShieldCheck className="size-4" /> {t('الإدارة', 'Administration')}
            </Link>
          )}
          <Link href="/premium" className="press flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted" data-testid="nav-premium">
            <Sparkles className="size-4" /> Premium
          </Link>
          <AuthButtons />
          <Toggles />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand size={34} />
        <div className="flex items-center gap-2">
          <Toggles />
          {isAdmin && (
            <Link href="/admin" data-testid="nav-admin-mobile" className="press grid size-10 place-items-center rounded-xl border border-border bg-card" aria-label={t('الإدارة', 'Administration')}>
              <ShieldCheck className="size-4" />
            </Link>
          )}
          <Link href="/account" data-testid="nav-account-mobile" className="press grid size-10 place-items-center rounded-xl border border-border bg-card" aria-label={t('الحساب', 'Account')}>
            <UserRound className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-8 lg:ms-64 lg:max-w-none lg:px-12 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-5xl"><PlatformNotices />{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} data-testid={`tab-${i.href.slice(1)}`} className={cn('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', active(i.href) ? 'text-primary' : 'text-muted-foreground')}>
            <span className={cn('grid h-7 w-11 place-items-center rounded-full transition-colors', active(i.href) && 'bg-primary/15')}>
              <i.icon className="size-[18px]" />
            </span>
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PublicFrame({ children }: { children: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="grain min-h-[100dvh] bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <Toggles />
          <Link href="/dashboard" className="press hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:block">{t('افتح التطبيق', 'Open app')}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-8">{children}</main>
      <Footer />
    </div>
  );
}

export function Footer() {
  const { t } = useApp();
  const settings = useGetPublicSettings();
  return (
    <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
      <div className="mb-2 flex justify-center gap-5">
        <Link href="/privacy" className="hover:text-foreground" data-testid="link-privacy">{t('الخصوصية', 'Privacy')}</Link>
        <Link href="/terms" className="hover:text-foreground" data-testid="link-terms">{t('الشروط', 'Terms')}</Link>
        <Link href="/premium" className="hover:text-foreground" data-testid="link-premium">Premium</Link>
        {settings.data?.supportEmail && <a href={`mailto:${settings.data.supportEmail}`} className="hover:text-foreground" data-testid="link-support">{t('الدعم', 'Support')}</a>}
      </div>
      <p>{t('مشروع تعلّم شخصي — محتوى تجريبي بانتظار المراجعة.', 'A personal learning project — pilot content awaiting review.')}</p>
    </footer>
  );
}
