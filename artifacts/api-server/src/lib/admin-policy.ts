import { HttpError } from "./http-error";
export type AppRole = "owner" | "admin" | "learner";
export function assertAccountUsable(account: { suspended: boolean; deletedAt: Date | null } | undefined) {
  if (account?.deletedAt) throw new HttpError(401, "تم حذف هذا الحساب. سجّل الخروج.");
  if (account?.suspended) throw new HttpError(403, "هذا الحساب موقوف. تواصل مع إدارة التطبيق.");
}
export function normalizeRole(role: string | undefined): AppRole {
  return role === "owner" || role === "admin" ? role : "learner";
}
export function canManageTarget(actorRole: AppRole, actorId: string, targetRole: AppRole, targetId: string, destructive: boolean) {
  if (actorRole === "learner") return false;
  if (destructive && actorId === targetId) return false;
  if (targetRole === "owner" && actorId !== targetId) return false;
  if (actorRole === "admin" && targetRole !== "learner" && actorId !== targetId) return false;
  return true;
}
export function isComplimentary(grant: { enabled: boolean; expiresAt: Date | null } | undefined, now = new Date()) {
  return !!grant?.enabled && !!grant.expiresAt && grant.expiresAt > now;
}
