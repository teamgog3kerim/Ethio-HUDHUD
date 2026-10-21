type AnalyticsData = Record<string, string | number | boolean>;

export type AnalyticsPrivacyState = {
  enabled: boolean;
  reason: 'browser' | 'tracker' | 'preference' | 'storage' | null;
};

declare global {
  interface Window {
    hudhudAnalyticsPrivacy?: {
      getState(): AnalyticsPrivacyState;
      setEnabled(enabled: boolean): boolean;
    };
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

export function getAnalyticsPrivacy(): AnalyticsPrivacyState {
  if (typeof window === 'undefined' || !window.hudhudAnalyticsPrivacy) {
    return { enabled: false, reason: 'storage' };
  }
  return window.hudhudAnalyticsPrivacy.getState();
}

export function setAnalyticsEnabled(enabled: boolean): boolean {
  return window.hudhudAnalyticsPrivacy?.setEnabled(enabled) ?? false;
}

/** Separate explicit permission from the site's legacy default pageview state. */
export function hasAnalyticsOptIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('hudhud.analytics') === 'on';
  } catch {
    return false;
  }
}

/** Use only the platform-injected tracker; never queue events before consent. */
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === 'undefined') return;
  try {
    if (!getAnalyticsPrivacy().enabled) return;
    const privacy = window.navigator as Navigator & { globalPrivacyControl?: boolean };
    if (privacy.doNotTrack === '1' || privacy.globalPrivacyControl === true) return;
    if (window.localStorage.getItem('umami.disabled')) return;
    // No tracker means analytics is disabled, not loaded yet, or unavailable.
    // Do not inject one, retry, or replay events if settings change later.
    const result = window.umami?.track(name, data);
    if (result) void Promise.resolve(result).catch(() => { /* Analytics is optional. */ });
  } catch {
    // Includes unavailable storage and tracker errors: fail closed.
  }
}

export type InviteSource = 'dashboard' | 'account';
type InviteEvent =
  | { action: 'opened' }
  | { action: 'template_selected'; template: 'template_1' | 'template_2' | 'template_3' | 'template_4' }
  | { action: 'copy_succeeded' }
  | { action: 'share_handoff'; method: 'whatsapp' | 'telegram' | 'system_share' };

/** Only fixed categories, never message text, URLs, recipients or identity. */
export function trackInviteEvent(source: InviteSource, event: InviteEvent): void {
  if (typeof window === 'undefined') return;
  try {
    // Invitation measurement requires explicit opt-in, even where pageviews
    // follow the site's existing default. Never replay skipped interactions.
    if (!hasAnalyticsOptIn()) return;
    if (source !== 'dashboard' && source !== 'account') return;
    switch (event.action) {
      case 'opened':
        trackEvent('invite_opened', { source });
        break;
      case 'template_selected':
        if (!['template_1', 'template_2', 'template_3', 'template_4'].includes(event.template)) return;
        trackEvent('invite_template_selected', { source, template: event.template });
        break;
      case 'copy_succeeded':
        trackEvent('invite_copy_succeeded', { source, method: 'clipboard' });
        break;
      case 'share_handoff':
        if (!['whatsapp', 'telegram', 'system_share'].includes(event.method)) return;
        trackEvent('invite_share_handoff', { source, method: event.method });
        break;
    }
  } catch {
    // Storage and analytics availability must never affect invitations.
  }
}
