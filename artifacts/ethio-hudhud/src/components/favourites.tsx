import { Link } from 'wouter';
import { Bookmark } from 'lucide-react';
import { useFavourites, useFavouriteToggle, useGetProfile } from '@workspace/api-client-react';
import { Card, Empty, ErrorState, Skeleton } from './bits';
import { useApp } from '@/lib/app';

export function FavouriteButton({ id }: { id: string }) {
  const { t } = useApp();
  const f = useFavouriteToggle(id);
  return <div className="shrink-0">
    <button type="button" aria-pressed={f.saved} aria-label={f.saved ? t('إزالة من المحفوظات', 'Remove from saved') : t('حفظ لوقت لاحق', 'Save for later')}
      data-testid={`favourite-${id}`} disabled={f.disabled} onClick={f.toggle}
      className="press flex min-h-11 items-center gap-2 rounded-xl border border-border p-3 text-sm disabled:opacity-40">
      <Bookmark className={`size-5 ${f.saved ? 'fill-primary text-primary' : ''}`} />
      {f.saved ? t('محفوظ', 'Saved') : t('حفظ', 'Save')}
    </button>
    {f.error && <p role="alert" className="text-xs text-destructive">{t('تعذّر الحفظ. حاول مجدداً.', 'Could not update saved items. Try again.')}</p>}
  </div>;
}

export function SavedItems() {
  const q = useFavourites();
  const profile = useGetProfile();
  const { t, lang } = useApp();
  return <section className="space-y-3" aria-label={t('المحفوظات', 'Saved items')}>
    <p className="text-sm text-muted-foreground">{profile.data?.isGuest
      ? t('محفوظات الضيف تخص هذا المتصفح فقط. سجّل الدخول لحفظ مواد حسابك عبر الأجهزة؛ محفوظات الضيف لا تنتقل إلى الحساب.', 'Guest saves stay in this browser. Sign in to save across devices; guest saves are separate from your account.')
      : t('محفوظات حسابك متاحة عبر الأجهزة، مستقلة عن الإنجاز. المواد المؤرشفة لا تظهر هنا.', 'Your account saves sync across devices, independently of completion. Archived material is hidden.')}</p>
    {q.isLoading && <Skeleton className="h-32" />}
    {q.isError && <ErrorState onRetry={() => q.refetch()} what={t('المحفوظات', 'saved items')} />}
    {!q.isError && q.data?.length === 0 && <Empty icon={<Bookmark />} title={t('لا مواد محفوظة بعد', 'No saved items yet')} />}
    {!q.isError && q.data?.map(l => <Card key={l.id} className="flex items-center gap-3">
      <Link href={`/lesson/${l.id}`} className="min-w-0 flex-1 font-semibold">{lang === 'ar' ? l.titleAr : l.titleEn}
        <span className="block text-xs text-muted-foreground">{l.dialogue?.length ? t('محادثة', 'Conversation') : t('درس', 'Lesson')}{l.completed && ` · ${t('مكتمل', 'Completed')}`}</span>
      </Link><FavouriteButton id={l.id} />
    </Card>)}
  </section>;
}
