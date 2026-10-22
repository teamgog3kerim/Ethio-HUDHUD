import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Explicitly sandbox-only: never a source of live learning entitlements.
export const polarSandboxCheckouts = pgTable("polar_sandbox_checkouts", {
  id: uuid("id").primaryKey(), // Polar checkout ID, not a bearer credential
  userId: text("user_id").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull().default("pending"),
  checkoutUrl: text("checkout_url").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  subscriptionId: uuid("subscription_id"),
  subscriptionStatus: text("subscription_status"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  accessUntil: timestamp("access_until", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
}, table => [index("polar_sandbox_checkout_user_idx").on(table.userId)]);

export const polarSandboxEvents = pgTable("polar_sandbox_events", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertPolarSandboxCheckoutSchema = createInsertSchema(polarSandboxCheckouts);
export const insertPolarSandboxEventSchema = createInsertSchema(polarSandboxEvents);
export type PolarSandboxCheckoutRecord = typeof polarSandboxCheckouts.$inferSelect;
