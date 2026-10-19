import { getMobilePlatform } from './install-platform';

export interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pending: InstallEvent | null = null;
let listening = false;

// Capture before React mounts: Chrome can offer installation before the
// component's effect runs. A captured browser request is usable only once.
export function startInstallCapture() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('beforeinstallprompt', event => {
    if (getMobilePlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints) !== 'android') return;
    event.preventDefault();
    pending = event as InstallEvent;
  });
  window.addEventListener('appinstalled', clearPendingInstall);
}

export function getPendingInstall() { return pending; }
export function clearPendingInstall() { pending = null; }
