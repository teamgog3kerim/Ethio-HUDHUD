import { pgTable, text, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  description: text("description").notNull(),
  level: text("level").notNull(),
  category: text("category").notNull(),
  month: integer("month").notNull(),
});
export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  sequence: integer("sequence").notNull(),
  content: jsonb("content").notNull(),
  answerKey: jsonb("answer_key").notNull(),
  reviewStatus: text("review_status").notNull().default("pilot"),
  active: boolean("active").notNull().default(true),
});
export const insertCourseSchema = createInsertSchema(courses);
export const insertLessonSchema = createInsertSchema(lessons);
