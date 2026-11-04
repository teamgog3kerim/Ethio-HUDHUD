export type SignupNotificationState = {
  observedAccountCount: number;
  unreadSignupCount: number;
};

export function createSignupNotificationState(accountCount: number): SignupNotificationState {
  return {
    observedAccountCount: Math.max(0, accountCount),
    unreadSignupCount: 0,
  };
}

export function advanceSignupNotifications(
  state: SignupNotificationState,
  accountCount: number,
): SignupNotificationState {
  const nextCount = Math.max(0, accountCount);
  return {
    observedAccountCount: nextCount,
    unreadSignupCount: state.unreadSignupCount + Math.max(0, nextCount - state.observedAccountCount),
  };
}

export function dismissSignupNotifications(state: SignupNotificationState): SignupNotificationState {
  return { ...state, unreadSignupCount: 0 };
}

export function isSignupNotificationState(value: unknown): value is SignupNotificationState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.observedAccountCount === "number"
    && Number.isInteger(candidate.observedAccountCount)
    && candidate.observedAccountCount >= 0
    && typeof candidate.unreadSignupCount === "number"
    && Number.isInteger(candidate.unreadSignupCount)
    && candidate.unreadSignupCount >= 0;
}
