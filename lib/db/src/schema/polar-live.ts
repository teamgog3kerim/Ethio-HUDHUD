import { pgTable, text, uuid, timestamp, integer, index } from "drizzle-orm/pg-core";

// Durable receipt queue only. A signed receipt is NOT a paid entitlement.
// Keep only routing identifiers and a body hash, not billing addresses or email.
export const polarLiveEvents = pgTable("polar_live_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  checkoutId: uuid("checkout_id"),
  subscriptionId: uuid("subscription_id"),
  productId: uuid("product_id"),
  bodyHash: text("body_hash").notNull(),
  state: text("state").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, table => [index("polar_live_events_pending_idx").on(table.state, table.receivedAt)]);
