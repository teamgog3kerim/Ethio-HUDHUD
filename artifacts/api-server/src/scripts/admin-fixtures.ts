// Disposable development-only accounts for the protected admin browser check.
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { clerkClient } from "@clerk/express";
import { db, appAccounts, learners, pool } from "@workspace/db";
import { defaultPreferences } from "../lib/learner";
import { logger } from "../lib/logger";
async function main() {
  if (process.env.NODE_ENV === "production" || !process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) throw new Error("Fixtures are restricted to development Clerk");
  const tag = randomUUID().slice(0, 8);
  const fixtures = [];
  for (const [name, role] of [["Admin", "owner"], ["Learner", "learner"]] as const) {
    const email = `hudhud-${name.toLowerCase()}-check-${tag}@example.com`;
    const user = await clerkClient.users.createUser({ emailAddress: [email], firstName: name, lastName: "Check", skipPasswordRequirement: true });
    await db.insert(appAccounts).values({ userId: user.id, role });
    await db.insert(learners).values({ identity: `clerk:${user.id}`, preferences: { ...defaultPreferences, displayName: `${name} Check`, onboardingComplete: true, language: "en" } });
    fixtures.push({ id: user.id, email, role });
  }
  await writeFile("/tmp/hudhud-admin-fixtures.json", JSON.stringify(fixtures));
  logger.info({ count: fixtures.length }, "Disposable admin verification accounts prepared");
}
main().catch(err => { logger.error({ err }, "Fixture preparation failed"); process.exitCode = 1; }).finally(() => pool.end());
