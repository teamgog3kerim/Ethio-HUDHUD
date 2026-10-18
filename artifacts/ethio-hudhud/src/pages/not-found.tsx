import { LinkBtn } from '@/components/bits';
import { Logo } from '@/components/logo';
import { useApp } from '@/lib/app';

export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center">
      <div>
        <Logo size={72} className="mx-auto" />
        <h1 className="font-display mt-4 text-3xl font-extrabold">{t('الصفحة غير موجودة', 'Page not found')}</h1>
        <LinkBtn href="/" className="mt-6" testId="link-home">{t('العودة للرئيسية', 'Back home')}</LinkBtn>
      </div>
    </div>
  );
}
