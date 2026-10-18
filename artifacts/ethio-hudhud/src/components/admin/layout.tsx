import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert } from 'lucide-react';
import { useGetAdminAccess } from '@workspace/api-client-react';
import { Card, ErrorState, LinkBtn, PageHead, Skeleton } from '@/components/bits';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/app';
import { cn } from '@/lib/utils';

export function AdminLayout({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { t } = useApp();
  const [loc] = useLocation();
  const access = useGetAdminAccess();
  const tabs = [
    { href: '/admin', label: t('نظرة عامة', 'Overview') },
    { href: '/admin/users', label: t('المستخدمون', 'Users') },
    { href: '/admin/content', label: t('المحتوى', 'Content') },
    { href: '/admin/settings', label: t('الإعدادات', 'Settings') },
    { href: '/admin/audit', label: t('السجل', 'Audit') },
  ];
  let body: ReactNode;
  if (access.isLoading) body = <div className="space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /></div>;
  else if (access.isError) body = <ErrorState what={t('صلاحيات الإدارة', 'admin access')} onRetry={() => void access.refetch()} />;
  else if (!access.data?.signedIn) {
    body = (
      <Card className="flex flex-col items-center gap-3 py-10 text-center" data-testid="state-admin-guest">
        <ShieldAlert className="size-8 text-primary" />
        <p className="font-display text-lg font-bold">{t('سجّل الدخول للمتابعة', 'Sign in to continue')}</p>
        <p className="text-sm text-muted-foreground">{t('لوحة الإدارة تتطلب حسابًا مسجّلًا.', 'The administration area requires a signed-in account.')}</p>
        <LinkBtn href="/sign-in" testId="link-admin-signin">{t('تسجيل الدخول', 'Sign in')}</LinkBtn>
      </Card>
    );
  } else if (access.data.role === 'learner') {
    body = (
      <Card className="flex flex-col items-center gap-3 py-10 text-center" data-testid="state-admin-forbidden">
        <ShieldAlert className="size-8 text-destructive" />
        <p className="font-display text-lg font-bold">{t('غير مصرّح لك', 'Not permitted')}</p>
        <p className="text-sm text-muted-foreground">{t('حسابك الحالي ليس مديرًا. لا يمكنك فتح هذه الصفحات.', 'Your account is not an administrator, so these pages are closed to you.')}</p>
        <LinkBtn href="/dashboard" variant="outline">{t('العودة للرئيسية', 'Back home')}</LinkBtn>
      </Card>
    );
  } else {
    body = (
      <>
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1" aria-label="admin">
          {tabs.map((x) => (
            <Link key={x.href} href={x.href} data-testid={`admin-tab-${x.href.split('/')[2] ?? 'overview'}`}
              className={cn('press whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold', loc === x.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {x.label}
            </Link>
          ))}
        </nav>
        {children}
      </>
    );
  }
  return (
    <Shell>
      <PageHead eyebrow={t('الإدارة', 'Administration')} title={title} sub={sub} />
      {body}
    </Shell>
  );
}
