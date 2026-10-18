export type MobilePlatform = 'ios' | 'android';

export function getMobilePlatform(userAgent: string, platform: string, touchPoints: number): MobilePlatform | null {
  if (/iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return null;
}

export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|Line\/|; wv\)|\bwv\b/i.test(userAgent);
}
