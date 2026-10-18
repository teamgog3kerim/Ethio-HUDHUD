import { Router, type IRouter } from "express";
import { db, lessons, courses, adminAudit } from "@workspace/db";
import { and, eq, asc, count, sql } from "drizzle-orm";
import { SaveAdminLessonBody, GetAdminLessonsResponse, SaveAdminLessonResponse } from "@workspace/api-zod";
import { HttpError } from "../lib/http-error";
import { lessonContentSchema } from "../lib/lesson-validation";
const router: IRouter = Router();
router.get("/lessons", async (_req, res) => {
  const rows = await db.select().from(lessons).orderBy(asc(lessons.sequence));
  res.json(GetAdminLessonsResponse.parse(rows.map(row => ({ ...row, reason: "" }))));
});
router.put("/lessons/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 80) throw new HttpError(400, "استخدم معرّفاً فريداً بحروف لاتينية صغيرة وأرقام وشرطات.");
  const body = SaveAdminLessonBody.safeParse(req.body);
  if (!body.success) throw new HttpError(400, "بيانات الدرس أو سبب التغيير غير صالح.");
  const content = lessonContentSchema.safeParse(body.data.content);
  if (!content.success) throw new HttpError(400, `بنية المحتوى غير صالحة: ${content.error.issues[0]?.message}`);
  const data = body.data;
  if (data.reason.trim().length < 3 || data.answerKey.length !== content.data.exercises.length || data.answerKey.some((key, i) => key.correctIndex >= content.data.exercises[i]!.options.length || key.explanation.trim().length < 3)) throw new HttpError(400, "يجب أن يطابق مفتاح الإجابات كل تمرين مع شرح واضح وفهرس إجابة صالح.");
  const saved = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(970241)`);
    const [course] = await tx.select().from(courses).where(eq(courses.id, data.courseId));
    if (!course) throw new HttpError(400, "المسار غير موجود.");
    const [old] = await tx.select().from(lessons).where(eq(lessons.id, id));
    if (old?.active && (!data.active || old.courseId !== data.courseId)) {
      const [remaining] = await tx.select({ total: count() }).from(lessons).where(and(eq(lessons.courseId, old.courseId), eq(lessons.active, true)));
      if (remaining!.total <= 1) throw new HttpError(409, "لا يمكن إخفاء أو نقل آخر درس نشط في المسار.");
    }
    const values = { courseId: data.courseId, sequence: data.sequence, active: data.active, content: content.data, answerKey: data.answerKey, reviewStatus: "pilot" };
    const [row] = await tx.insert(lessons).values({ id, ...values }).onConflictDoUpdate({ target: lessons.id, set: values }).returning();
    await tx.insert(adminAudit).values({ actorId: res.locals.adminId, action: old ? "lesson.updated" : "lesson.created", targetId: id, detail: { reason: data.reason, courseId: data.courseId, active: data.active, reviewStatus: "pilot" } });
    return row!;
  });
  res.json(SaveAdminLessonResponse.parse({ ...saved, reason: data.reason }));
});
export default router;
