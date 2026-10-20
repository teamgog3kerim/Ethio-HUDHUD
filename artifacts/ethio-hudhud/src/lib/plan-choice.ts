export type PlanChoice = 'trial' | 'monthly' | 'six_month';

export function parsePlanChoice(value: unknown): PlanChoice | null {
  return value === 'trial' || value === 'monthly' || value === 'six_month' ? value : null;
}

// Only known plan IDs may cross an auth redirect; never accept a return URL.
export function planChoicePath(search: string) {
  const plan = parsePlanChoice(new URLSearchParams(search).get('plan'));
  return `/choose-plan${plan ? `?plan=${plan}` : ''}`;
}
