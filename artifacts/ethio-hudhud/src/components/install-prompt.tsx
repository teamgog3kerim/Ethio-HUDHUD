import { useEffect, useRef, useState } from 'react';
import { Download, EllipsisVertical, PlusSquare, Share, Smartphone } from 'lucide-react';
import { Btn } from '@/components/bits';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/lib/app';
import { getMobilePlatform, isInAppBrowser, type MobilePlatform } from '@/lib/install-platform';
import { trackEvent } from '@/lib/analytics';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const DISMISSED_KEY = 'hh-install-dismissed-at';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const { t, lang } = useApp();
  const [platform, setPlatform] = useState<MobilePlatform | null>(null);
  const [open, setOpen] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const installed = useRef(false);
  const installationTracked = useRef(false);
  const promptTracked = useRef(false);
  const instructionsTracked = useRef(new Set<string>());
  const instructions = inApp ? 'external_browser' : platform === 'ios' ? 'ios_share_menu' : (!deferred || manual) ? 'android_browser_menu' : null;

  useEffect(() => {
    if (!open) {
      promptTracked.current = false;
      instructionsTracked.current.clear();
      return;
    }
    if (!platform) return;
    const data = { platform, in_app_browser: inApp };
    if (!promptTracked.current) {
      promptTracked.current = true;
      trackEvent('install_prompt_shown', data);
    }
    if (instructions && !instructionsTracked.current.has(instructions)) {
      instructionsTracked.current.add(instructions);
      trackEvent('install_instructions_shown', { ...data, instruction_type: instructions });
    }
  }, [open, platform, inApp, instructions]);

  useEffect(() => {
    const device = getMobilePlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    const standalone = window.matchMedia('(display-mode: standalone)');
    const isStandalone = () => standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!device || isStandalone()) return;
    setPlatform(device);
    setInApp(isInAppBrowser(navigator.userAgent));
    let recentlyDismissed = false;
    try {
      const value = Number(localStorage.getItem(DISMISSED_KEY));
      recentlyDismissed = value > 0 && Date.now() - value < WEEK;
    } catch { /* Private browsing can disable storage; the prompt still works. */ }
    const timer = recentlyDismissed ? undefined : window.setTimeout(() => {
      if (!installed.current && !isStandalone()) setOpen(true);
    }, 2000);
    const beforeInstall = (event: Event) => {
      if (device !== 'android') return;
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    const closeInstalledPrompt = () => {
      installed.current = true;
      setOpen(false);
      setDeferred(null);
    };
    const onInstalled = () => {
      // Only this browser event confirms completion. Standalone display mode
      // (especially on iOS) is not evidence of a new installation.
      if (!installationTracked.current) {
        installationTracked.current = true;
        trackEvent('install_completed', {
          platform: device,
          in_app_browser: isInAppBrowser(navigator.userAgent),
          source: 'appinstalled',
        });
      }
      closeInstalledPrompt();
    };
    const onDisplayChange = () => { if (isStandalone()) closeInstalledPrompt(); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    standalone.addEventListener('change', onDisplayChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      standalone.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const closePrompt = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* Storage is optional. */ }
  };
  const dismiss = () => {
    if (open && platform) trackEvent('install_prompt_dismissed', { platform, in_app_browser: inApp });
    closePrompt();
  };
  const install = async () => {
    if (!deferred) { setManual(true); return; }
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (platform) trackEvent('install_browser_response', {
        platform, in_app_browser: inApp, outcome: choice.outcome,
      });
      // Acceptance is not completion, nor a dismissal of our prompt.
      if (choice.outcome === 'accepted') closePrompt();
      else setManual(true);
    } catch {
      setManual(true);
    } finally {
      // Browser install events can only be used once.
      setDeferred(null);
      setBusy(false);
    }
  };

  if (!platform) return null;
  return <Dialog open={open} onOpenChange={next => { if (!next) dismiss(); }}>
    <DialogContent dir={lang === 'ar' ? 'rtl' : 'ltr'} className="w-[calc(100%-2rem)] max-w-sm rounded-3xl border-border bg-card p-6 text-start" data-testid="install-prompt">
      <div className="flex items-center gap-3 pt-2">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={64} height={64} className="size-16 rounded-2xl" />
        <div><p className="text-xs font-bold tracking-widest text-primary">ETHIO HUDHUD</p><DialogTitle className="font-display mt-2 text-xl leading-relaxed">{t('ثبّت هدهد على هاتفك', 'Install Hudhud on your phone')}</DialogTitle></div>
      </div>
      <DialogDescription className="text-start leading-relaxed">{t('افتح هدهد من شاشتك الرئيسية كتطبيق، دون كتابة عنوان الموقع كل مرة.', 'Open Hudhud like an app from your home screen, without typing the website address again.')}</DialogDescription>
      {inApp ? <div className="rounded-2xl bg-secondary p-4 text-sm leading-relaxed">
        <Smartphone className="mb-2 size-5 text-primary" />
        {platform === 'ios'
          ? t('افتح هذه الصفحة في Safari من قائمة المتصفح، ثم اضغط مشاركة ← إضافة إلى الشاشة الرئيسية.', 'Open this page in Safari from the browser menu, then choose Share → Add to Home Screen.')
          : t('افتح هذه الصفحة في Chrome أو متصفح هاتفك من قائمة التطبيق، ثم اختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية.', 'Open this page in Chrome or your phone’s browser from the app menu, then choose Install app or Add to Home screen.')}
      </div> : platform === 'ios' ? <ol className="space-y-3 rounded-2xl bg-secondary p-4 text-sm">
        <li className="flex items-start gap-3"><Share className="mt-1 size-5 shrink-0 text-primary" /><span>{t('١. افتح قائمة المشاركة في المتصفح (قد تكون داخل قائمة ⋯).', '1. Open the browser’s Share menu (it may be inside the ⋯ menu).')}</span></li>
        <li className="flex items-start gap-3"><PlusSquare className="mt-1 size-5 shrink-0 text-primary" /><span>{t('٢. اختر «إضافة إلى الشاشة الرئيسية»، ثم «إضافة».', '2. Choose “Add to Home Screen”, then “Add”.')}</span></li>
        <li className="text-xs text-muted-foreground">{t('إذا لم تجد الخيار، افتح الصفحة في Safari وجرّب مجدداً. لا يسمح iOS بزر تثبيت تلقائي داخل الموقع.', 'If the option is missing, open this page in Safari and try again. iOS does not allow a website to trigger automatic installation.')}</li>
      </ol> : (!deferred || manual) ? <div className="rounded-2xl bg-secondary p-4 text-sm leading-relaxed">
        <EllipsisVertical className="mb-2 size-5 text-primary" />
        {t('افتح قائمة المتصفح ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إذا لم يظهر الخيار، جرّب Chrome خارج المتصفح المدمج بالتطبيقات.', 'Open the browser menu ⋮ and choose “Install app” or “Add to Home screen”. If missing, try Chrome outside an in-app browser.')}
      </div> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">{t('مجاني · لا يحتاج متجر تطبيقات · يتطلب اتصالاً بالإنترنت للتعلّم وحفظ التقدّم.', 'Free · No app store needed · Learning and saved progress require an internet connection.')}</p>
      <div className="flex flex-col gap-3">
        {platform === 'android' && deferred && !inApp && <Btn onClick={() => void install()} disabled={busy} data-testid="button-install-app"><Download className="size-4" />{busy ? t('جارٍ فتح التثبيت…', 'Opening installation…') : t('تثبيت التطبيق', 'Install app')}</Btn>}
        <Btn variant="ghost" onClick={dismiss} data-testid="button-install-later">{t('ليس الآن', 'Not now')}</Btn>
      </div>
    </DialogContent>
  </Dialog>;
}
