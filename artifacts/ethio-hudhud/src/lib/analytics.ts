type AnalyticsData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

/** Use only the platform-injected tracker; never queue events before consent. */
export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === 'undefined') return;
  try {
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
