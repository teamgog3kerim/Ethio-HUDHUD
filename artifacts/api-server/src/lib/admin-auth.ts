import { createHash } from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import { db, appAccounts, ownerBootstrapGrants, adminAudit } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { HttpError } from "./http-error";
import { normalizeRole, assertAccountUsable, type AppRole } from "./admin-policy";

function ownerConfig() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email");
  // Development and published Clerk tenants have different identities. A copied
  // development DB must not suppress the production tenant's bootstrap.
  const tenant = process.env.CLERK_PUBLISHABLE_KEY;
  if (!tenant) throw new Error("Clerk publishable key is required for owner bootstrap");
  return { email, key: createHash("sha256").update(`hudhud-owner:${tenant}:${email}`).digest("hex") };
}
export async function bootstrapOwnerForUser(userId: string) {
  const config = ownerConfig();
  if (!config) return "not_configured";
  const [done] = await db.select().from(ownerBootstrapGrants).where(eq(ownerBootstrapGrants.configKey, config.key));
  if (done) return "already_initialized";
  let user;
  try { user = await clerkClient.users.getUser(userId); }
  catch (err) {
    if ((err as { status?: number }).status === 404) throw new HttpError(401, "لم يعد هذا الحساب موجوداً. سجّل الخروج.");
    throw err;
  }
  // Match only an address whose ownership Clerk has actually verified.
  const ownsEmail = user.emailAddresses.some(e => e.emailAddress.trim().toLowerCase() === config.email && e.verification?.status === "verified");
  if (!ownsEmail || user.banned) return "waiting_for_verified_owner";
  return db.transaction(async tx => {
    const [claim] = await tx.insert(ownerBootstrapGrants).values({ configKey: config.key, userId }).onConflictDoNothing().returning();
    if (!claim) return "already_initialized";
    await tx.insert(appAccounts).values({ userId, role: "owner", suspended: false })
      .onConflictDoUpdate({ target: appAccounts.userId, set: { role: "owner", updatedAt: new Date() } });
    await tx.insert(adminAudit).values({ actorId: userId, action: "owner.bootstrap", targetId: userId, detail: { verifiedEmailOwnership: true } });
    return "granted";
  });
}
export async function bootstrapConfiguredOwner() {
  const config = ownerConfig();
  if (!config) return "not_configured";
  const [done] = await db.select().from(ownerBootstrapGrants).where(eq(ownerBootstrapGrants.configKey, config.key));
  if (done) return "already_initialized";
  const users = await clerkClient.users.getUserList({ emailAddress: [config.email], limit: 10 });
  if (!users.data.length) return "waiting_for_account_registration";
  for (const user of users.data) {
    const result = await bootstrapOwnerForUser(user.id);
    if (result === "granted" || result === "already_initialized") return result;
  }
  return "waiting_for_verified_owner";
}
export async function getAppRole(userId: string): Promise<AppRole> {
  const [account] = await db.select().from(appAccounts).where(eq(appAccounts.userId, userId));
  assertAccountUsable(account);
  if (normalizeRole(account?.role) !== "learner") return normalizeRole(account?.role);
  await bootstrapOwnerForUser(userId);
  const [fresh] = await db.select().from(appAccounts).where(eq(appAccounts.userId, userId));
  return normalizeRole(fresh?.role);
}
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, "سجّل الدخول أولاً.");
  const role = await getAppRole(userId);
  if (role === "learner") throw new HttpError(403, "هذه الصفحة متاحة للإدارة فقط.");
  res.locals.adminId = userId;
  res.locals.adminRole = role;
  next();
};
export const enforceAccountStatus: RequestHandler = async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (userId) {
    const [account] = await db.select().from(appAccounts).where(eq(appAccounts.userId, userId));
    assertAccountUsable(account);
  }
  next();
};
