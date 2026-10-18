import { pgTable, text, uuid, timestamp, integer, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { learners } from "./learners";
import { lessons } from "./courses";

export const attempts = pgTable("exercise_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id),
  answers: jsonb("answers").notNull(),
  score: integer("score").notNull(),
  activeSeconds: integer("active_seconds").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("attempts_learner_idx").on(t.learnerId, t.createdAt)]);

export const completions = pgTable("lesson_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id),
  score: integer("score").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex("completion_unique").on(t.learnerId, t.lessonId)]);

export const reviews = pgTable("vocabulary_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  wordId: text("word_id").notNull(),
  interval: integer("interval").notNull().default(0),
  nextReview: timestamp("next_review", { withTimezone: true }).defaultNow().notNull(),
  remembered: boolean("remembered").notNull().default(false),
}, t => [uniqueIndex("review_unique").on(t.learnerId, t.wordId)]);

export const chatMessages = pgTable("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("messages_learner_idx").on(t.learnerId, t.createdAt)]);
export const insertAttemptSchema = createInsertSchema(attempts);

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("ai_usage_learner_idx").on(t.learnerId, t.createdAt)]);

export const lessonStarts = pgTable("lesson_starts", {
  learnerId: uuid("learner_id").notNull().references(() => learners.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex("lesson_start_unique").on(t.learnerId, t.lessonId)]);
