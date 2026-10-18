import { readFile, unlink } from "node:fs/promises";
import { clerkClient } from "@clerk/express";
import { db, learners, appAccounts, accessGrants, adminAudit, lessons, pool } from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { logger } from "../lib/logger";
async function main() {
  if (process.env.NODE_ENV === "production" || !process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) throw new Error("Cleanup is restricted to development Clerk");
  const fixtures = JSON.parse(process.argv[2] ?? await readFile("/tmp/hudhud-admin-fixtures.json", "utf8")) as { id: string; email: string; role: string }[];
  if (!fixtures.length || fixtures.some(f => !/^hudhud-(admin|learner)-check-[a-f0-9]{8}@example\.com$/.test(f.email) || !/^user_[a-zA-Z0-9]+$/.test(f.id))) throw new Error("Invalid disposable fixture manifest");
  for (const fixture of fixtures) {
    let user;
    try { user = await clerkClient.users.getUser(fixture.id); }
    catch (err) { if ((err as { status?: number }).status !== 404) throw err; }
    if (user) {
      if (!user.emailAddresses.some(e => e.emailAddress === fixture.email)) throw new Error("Refusing to remove an account outside the fixture manifest");
    }
    await db.insert(appAccounts).values({ userId: fixture.id, role: "learner", suspended: true, deletedAt: new Date() })
      .onConflictDoUpdate({ target: appAccounts.userId, set: { role: "learner", suspended: true, deletedAt: new Date(), updatedAt: new Date() } });
    if (user) await clerkClient.users.deleteUser(fixture.id);
  }
  const ids = fixtures.map(f => f.id);
  await db.transaction(async tx => {
    const created = await tx.select().from(adminAudit).where(and(inArray(adminAudit.actorId, ids), eq(adminAudit.action, "lesson.created"), eq(adminAudit.targetId, "admin-browser-check")));
    if (created.length) await tx.delete(lessons).where(and(eq(lessons.id, "admin-browser-check"), eq(lessons.active, false)));
    await tx.delete(learners).where(inArray(learners.identity, ids.map(id => `clerk:${id}`)));
    await tx.delete(accessGrants).where(inArray(accessGrants.userId, ids));
    await tx.delete(adminAudit).where(or(inArray(adminAudit.actorId, ids), inArray(adminAudit.targetId, ids)));
  });
  if (!process.argv[2]) await unlink("/tmp/hudhud-admin-fixtures.json");
  logger.info({ count: ids.length }, "Disposable admin verification records removed");
}
main().catch(err => { logger.error({ err }, "Fixture cleanup failed"); process.exitCode = 1; }).finally(() => pool.end());
