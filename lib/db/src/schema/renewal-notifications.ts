import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { learners } from "./learners";
import { uuid } from "drizzle-orm/pg-core";

// One physical installation can belong to only one account at a time.
export const renewalDevices = pgTable("renewal_devices", {
  id: uuid("id").primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(),
  address: text("address").notNull().unique(),
  subscription: jsonb("subscription").notNull(),
  timezone: text("timezone").notNull(),
  state: text("state").notNull().default("enabled"),
  revocationHash: text("revocation_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Atomic claims survive process restarts and concurrent workers.
export const renewalDeliveries = pgTable("renewal_deliveries", {
  id: text("id").primaryKey(),
  deviceId: uuid("device_id").notNull().references(() => renewalDevices.id, { onDelete: "cascade" }),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  state: text("state").notNull(),
  receipt: text("receipt"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
