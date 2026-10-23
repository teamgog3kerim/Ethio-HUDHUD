import { pgTable, uuid, text, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// A durable intent is committed BEFORE calling Polar, so an ambiguous network
// failure cannot silently produce another charge on the next click.
export const polarLivePurchases = pgTable("polar_live_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  plan: text("plan").notNull(),
  checkoutId: uuid("checkout_id").unique(),
  checkoutUrl: text("checkout_url"),
  status: text("status").notNull().default("creating"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  subscriptionId: uuid("subscription_id").unique(),
  subscriptionStatus: text("subscription_status"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  paidUntil: timestamp("paid_until", { withTimezone: true }),
  accessUntil: timestamp("access_until", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer("attempts").notNull().default(0),
  // Immutable proof/period boundaries for manually renewed one-month purchases.
  // Refunding a period revokes its access, never resets the six-payment counter.
  monthlyOrderId: uuid("monthly_order_id").unique(),
  monthlyPaidAt: timestamp("monthly_paid_at", { withTimezone: true }),
  monthlyPeriodStart: timestamp("monthly_period_start", { withTimezone: true }),
  monthlyOrdinal: integer("monthly_ordinal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("polar_live_purchases_user_idx").on(table.userId),
  index("polar_live_purchases_due_idx").on(table.nextCheckAt),
]);
export const insertPolarLivePurchaseSchema = createInsertSchema(polarLivePurchases);
export type LivePurchase = typeof polarLivePurchases.$inferSelect;
