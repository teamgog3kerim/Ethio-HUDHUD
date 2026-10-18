import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { db, learners, appAccounts, accessGrants, adminAudit, completions } from "@workspace/db";
import { eq, inArray, count } from "drizzle-orm";
import { GetAdminUsersResponse, UpdateAdminUserBody, DeleteAdminUserBody, SetAdminUserAccessBody } from "@workspace/api-zod";
import { z } from "zod/v4";
import { HttpError } from "../lib/http-error";
import { defaultPreferences } from "../lib/learner";
import { getAppSettings } from "../lib/app-settings";
import { normalizeRole, canManageTarget, isComplimentary, type AppRole } from "../lib/admin-policy";
const router: IRouter = Router();
const listQuery = z.object({ search: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) });
async function targetFor(actorId: string, actorRole: AppRole, id: string, destructive = false) {
  if (!/^user_[a-zA-Z0-9]+$/.test(id)) throw new HttpError(400, "معرّف حساب غير صالح.");
  const [control] = await db.select().from(appAccounts).where(eq(appAccounts.userId, id));
  if (control?.deletedAt) throw new HttpError(404, "تم حذف هذا الحساب بالفعل.");
  const targetRole = normalizeRole(control?.role);
  if (!canManageTarget(actorRole, actorId, targetRole, id, destructive)) throw new HttpError(403, "لا تملك صلاحية تعديل هذا الحساب، أو لا يمكنك تنفيذ هذا الإجراء على حسابك.");
  const user = await clerkClient.users.getUser(id);
  return { user, control, role: targetRole };
}
router.get("/users", async (req, res) => {
  const query = listQuery.safeParse(req.query);
  if (!query.success) throw new HttpError(400, "بحث أو رقم صفحة غير صالح.");
  const { search, page } = query.data;
  const directory = await clerkClient.users.getUserList({ query: search || undefined, limit: 25, offset: (page - 1) * 25, orderBy: "-created_at" });
  const ids = directory.data.map(u => u.id);
  const [controls, grants, profiles] = ids.length ? await Promise.all([
    db.select().from(appAccounts).where(inArray(appAccounts.userId, ids)),
    db.select().from(accessGrants).where(inArray(accessGrants.userId, ids)),
    db.select().from(learners).where(inArray(learners.identity, ids.map(id => `clerk:${id}`))),
  ]) : [[], [], []];
  const counts = profiles.length ? await db.select({ learnerId: completions.learnerId, total: count() }).from(completions).where(inArray(completions.learnerId, profiles.map(p => p.id))).groupBy(completions.learnerId) : [];
  const settings = await getAppSettings();
  const users = directory.data.map(user => {
    const control = controls.find(c => c.userId === user.id);
    const grant = grants.find(g => g.userId === user.id);
    const profile = profiles.find(p => p.identity === `clerk:${user.id}`);
    const prefs = profile?.preferences as Partial<typeof defaultPreferences> | undefined;
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
    const total = counts.find(c => c.learnerId === profile?.id)?.total ?? 0;
    return {
      id: user.id, email: email?.emailAddress ?? "", emailVerified: email?.verification?.status === "verified",
      displayName: prefs?.displayName ?? user.fullName ?? user.username ?? "متعلّم جديد",
      role: normalizeRole(control?.role), suspended: !!control?.suspended || user.banned,
      createdAt: new Date(user.createdAt).toISOString(), lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
      lessonsCompleted: total, xp: total * 30, dailyGoal: prefs?.dailyGoal ?? settings.defaultDailyGoal,
      accessPlan: isComplimentary(grant) ? "complimentary" : "free",
      accessExpiresAt: grant?.expiresAt?.toISOString() ?? null, accessReason: grant?.reason ?? "",
    };
  });
  res.json(GetAdminUsersResponse.parse({ users, total: directory.totalCount, page, pageSize: 25 }));
});
router.patch("/users/:id", async (req, res) => {
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "بيانات التعديل غير صالحة. سبب الإجراء مطلوب.");
  const data = parsed.data;
  if (data.reason.trim().length < 3 || (data.displayName !== undefined && !data.displayName.trim())) throw new HttpError(400, "الاسم والسبب لا يمكن أن يكونا فارغين.");
  const actorId = res.locals.adminId as string;
  const actorRole = res.locals.adminRole as AppRole;
  const id = String(req.params.id);
  const { user, control, role } = await targetFor(actorId, actorRole, id, data.suspended === true || data.role !== undefined);
  if (data.role !== undefined && actorRole !== "owner") throw new HttpError(403, "المالك فقط يمكنه تعيين أو إزالة صلاحية المسؤول.");
  if (role === "owner" && (data.role !== undefined || data.suspended !== undefined)) throw new HttpError(403, "لا يمكن إزالة صلاحية المالك أو إيقاف حسابه من هذه الشاشة.");
  if (data.role === "admin" && !user.emailAddresses.some(e => e.verification?.status === "verified")) throw new HttpError(409, "يجب التحقق من بريد المستخدم قبل منحه صلاحية الإدارة.");
  // Revoke sign-in access too, not just a client-side badge.
  if (data.suspended === true) {
    await db.insert(appAccounts).values({ userId: id, role, suspended: true })
      .onConflictDoUpdate({ target: appAccounts.userId, set: { suspended: true, updatedAt: new Date() } });
    await db.insert(adminAudit).values({ actorId, action: "user.suspension_requested", targetId: id, detail: { reason: data.reason } });
    await clerkClient.users.banUser(id);
  }
  if (data.suspended === false && (control?.suspended || user.banned)) await clerkClient.users.unbanUser(id);
  await db.transaction(async tx => {
    await tx.insert(appAccounts).values({ userId: id, role: data.role ?? role, suspended: data.suspended ?? control?.suspended ?? false })
      .onConflictDoUpdate({ target: appAccounts.userId, set: { ...(data.role !== undefined ? { role: data.role } : {}), ...(data.suspended !== undefined ? { suspended: data.suspended } : {}), updatedAt: new Date() } });
    if (data.displayName !== undefined || data.dailyGoal !== undefined) {
      const [profile] = await tx.select().from(learners).where(eq(learners.identity, `clerk:${id}`));
      const preferences = { ...defaultPreferences, ...(profile?.preferences as object ?? {}), ...(data.displayName !== undefined ? { displayName: data.displayName.trim() } : {}), ...(data.dailyGoal !== undefined ? { dailyGoal: data.dailyGoal } : {}) };
      await tx.insert(learners).values({ identity: `clerk:${id}`, preferences }).onConflictDoUpdate({ target: learners.identity, set: { preferences } });
    }
    await tx.insert(adminAudit).values({ actorId, action: "user.update", targetId: id, detail: { ...data, previousRole: role, previousSuspended: !!control?.suspended } });
  });
  res.json({ status: "saved" });
});
router.put("/users/:id/access", async (req, res) => {
  const parsed = SetAdminUserAccessBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "سبب منح الوصول وتاريخ الانتهاء مطلوبان.");
  const data = parsed.data;
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.enabled && (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 366 * 86400000)) throw new HttpError(400, "الوصول المجاني يحتاج تاريخ انتهاء مستقبلي خلال سنة.");
  if (data.reason.trim().length < 3) throw new HttpError(400, "اكتب سبباً واضحاً.");
  const id = String(req.params.id), actorId = res.locals.adminId as string;
  await targetFor(actorId, res.locals.adminRole as AppRole, id, false);
  await db.transaction(async tx => {
    await tx.insert(accessGrants).values({ userId: id, enabled: data.enabled, expiresAt: data.enabled ? expiresAt : null, reason: data.reason.trim(), grantedBy: actorId })
      .onConflictDoUpdate({ target: accessGrants.userId, set: { enabled: data.enabled, expiresAt: data.enabled ? expiresAt : null, reason: data.reason.trim(), grantedBy: actorId, updatedAt: new Date() } });
    await tx.insert(adminAudit).values({ actorId, action: data.enabled ? "access.complimentary_granted" : "access.complimentary_revoked", targetId: id, detail: { ...data, source: "admin_grant", paidSubscription: false } });
  });
  res.json({ status: "saved" });
});
router.delete("/users/:id", async (req, res) => {
  const parsed = DeleteAdminUserBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "البريد التأكيدي وسبب الحذف مطلوبان.");
  if (parsed.data.reason.trim().length < 3) throw new HttpError(400, "اكتب سبباً واضحاً للحذف.");
  const id = String(req.params.id), actorId = res.locals.adminId as string;
  const target = await targetFor(actorId, res.locals.adminRole as AppRole, id, true);
  if (target.role === "owner") throw new HttpError(403, "حساب المالك محمي من الحذف.");
  const email = target.user.emailAddresses.find(e => e.id === target.user.primaryEmailAddressId)?.emailAddress ?? target.user.emailAddresses[0]?.emailAddress;
  if (!email || parsed.data.confirmationEmail.trim().toLowerCase() !== email.toLowerCase()) throw new HttpError(400, "اكتب البريد الإلكتروني للمستخدم بالضبط للتأكيد.");
  // Suspend first: if the provider fails, access stays safely blocked and can be restored.
  await db.insert(appAccounts).values({ userId: id, role: "learner", suspended: true }).onConflictDoUpdate({ target: appAccounts.userId, set: { suspended: true, updatedAt: new Date() } });
  await db.insert(adminAudit).values({ actorId, action: "user.deletion_requested", targetId: id, detail: { reason: parsed.data.reason } });
  await clerkClient.users.deleteUser(id);
  await db.transaction(async tx => {
    await tx.delete(learners).where(eq(learners.identity, `clerk:${id}`));
    await tx.delete(accessGrants).where(eq(accessGrants.userId, id));
    // Already-minted session JWTs can remain valid briefly after provider deletion.
    // Keep a tombstone so those tokens cannot recreate learning records.
    await tx.update(appAccounts).set({ role: "learner", suspended: true, deletedAt: new Date(), updatedAt: new Date() }).where(eq(appAccounts.userId, id));
    await tx.insert(adminAudit).values({ actorId, action: "user.deleted", targetId: id, detail: { reason: parsed.data.reason, authenticationIdentityDeleted: true } });
  });
  res.json({ status: "deleted" });
});
export default router;
