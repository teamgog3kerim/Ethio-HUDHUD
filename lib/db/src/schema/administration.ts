import { pgTable, text, boolean, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const appAccounts = pgTable("app_accounts", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull().default("learner"),
  suspended: boolean("suspended").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
// No learner FK: resetting learning data must not reset roles or suspensions.
export const ownerBootstrapGrants = pgTable("owner_bootstrap_grants", {
  configKey: text("config_key").primaryKey(),
  userId: text("user_id").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
});
export const applicationSettings = pgTable("application_settings", {
  id: text("id").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const accessGrants = pgTable("access_grants", {
  userId: text("user_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  reason: text("reason").notNull(),
  grantedBy: text("granted_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const adminAudit = pgTable("admin_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("admin_audit_created_idx").on(t.createdAt)]);
export const insertAppAccountSchema = createInsertSchema(appAccounts);
export const insertApplicationSettingsSchema = createInsertSchema(applicationSettings);
export const insertAccessGrantSchema = createInsertSchema(accessGrants);
export const insertAdminAuditSchema = createInsertSchema(adminAudit);
