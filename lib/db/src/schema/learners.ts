import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const learners = pgTable("learners", {
  id: uuid("id").defaultRandom().primaryKey(),
  identity: text("identity").notNull().unique(),
  preferences: jsonb("preferences").notNull().default({}),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertLearnerSchema = createInsertSchema(learners).omit({ id: true, joinedAt: true });
export type Learner = typeof learners.$inferSelect;
