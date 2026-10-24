import { parsePlanChoice } from '@/lib/plan-choice';

export function paidPlanFromSearch(search: string): 'monthly' | 'six_month' | null {
  const p = parsePlanChoice(new URLSearchParams(search).get('plan'));
  return p === 'monthly' || p === 'six_month' ? p : null;
}

// Paid intent keeps the chosen plan and launches checkout once; otherwise straight to lessons.
export function signUpDestination(search: string): string {
  const p = paidPlanFromSearch(search);
  return p ? `/choose-plan?plan=${p}&checkout=1` : '/learn';
}

export function signInDestination(search: string): string {
  const p = paidPlanFromSearch(search);
  return p ? `/choose-plan?plan=${p}&checkout=1` : '/start';
}
