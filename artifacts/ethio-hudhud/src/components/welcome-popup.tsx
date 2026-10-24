import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Logo } from '@/components/logo';
import { useApp } from '@/lib/app';
import { WELCOME_DURATION_MS } from '@/lib/signup-welcome';

export function WelcomePopup({ onDismiss }: { onDismiss: () => void }) {
  const { t, lang } = useApp();

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogPortal>
        <DialogPrimitive.Overlay
          data-testid="welcome-backdrop"
          onClick={onDismiss}
          className="fixed inset-0 z-[200] bg-[#0b2a22]/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          data-welcome-popup
          data-testid="welcome-popup"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          onClick={onDismiss}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[201] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-3xl border border-[#E6B85C]/40 bg-[#F7F8F5] text-[#104C3D] shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:bg-[#12332b] dark:text-[#F7F8F5] motion-reduce:animate-none"
        >
          <div className="flex flex-col items-center gap-3 px-6 pb-7 pt-8 text-center">
            <div className="rounded-2xl bg-[#176B55]/10 p-3 dark:bg-[#E6B85C]/15">
              <Logo size={64} />
            </div>
            <DialogTitle className="text-2xl font-bold leading-snug">
              {t('أهلاً بك في هدهد', 'Welcome to HUDHUD')}
            </DialogTitle>
            <DialogDescription className="text-base text-[#104C3D]/75 dark:text-[#F7F8F5]/75">
              {t('هيا نبدأ تعلم الأمهرية معاً.', "Let's begin learning Amharic together.")}
            </DialogDescription>
            <span className="mt-1 text-xs text-[#104C3D]/55 dark:text-[#F7F8F5]/55">
              {t('اضغط في أي مكان للبدء', 'Tap anywhere to start')}
            </span>
          </div>
          <div className="h-1 w-full bg-[#176B55]/15" aria-hidden="true">
            <div
              className="h-full origin-left bg-[#E6B85C] motion-reduce:hidden"
              style={{ animation: `hh-welcome-bar ${WELCOME_DURATION_MS}ms linear forwards`, transformOrigin: lang === 'ar' ? 'right' : 'left' }}
            />
          </div>
          <style>{'@keyframes hh-welcome-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
          <DialogPrimitive.Close className="sr-only" data-testid="button-welcome-close">
            {t('إغلاق', 'Close')}
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
