import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { learners } from "./learners";

// Server-owned clock; visiting pricing or reloading must never restart a trial.
export const courseTrials = pgTable("course_trials", {
  learnerId: uuid("learner_id").primaryKey().references(() => learners.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
});
