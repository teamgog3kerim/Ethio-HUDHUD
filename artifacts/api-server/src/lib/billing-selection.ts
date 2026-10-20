export type CoursePlanChoice = "trial" | "monthly" | "six_month";

export function selectedCoursePlan(preferences: unknown): CoursePlanChoice | null {
  if (!preferences || typeof preferences !== "object") return null;
  const value = (preferences as { selectedPlan?: unknown }).selectedPlan;
  return value === "trial" || value === "monthly" || value === "six_month" ? value : null;
}
