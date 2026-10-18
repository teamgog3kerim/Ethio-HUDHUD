import { Router, type IRouter } from "express";
import { db, learners, lessons, completions, attempts, reviews, chatMessages, lessonStarts, type LessonContent } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  GetProfileResponse, SaveProfileBody, GetCoursesResponse, GetLessonParams, GetLessonResponse,
  CompleteLessonBody, CompleteLessonParams, CompleteLessonResponse, GetProgressResponse,
  GetStudyPlanResponse, GetVocabularyResponse, ReviewVocabularyBody, ReviewVocabularyParams,
  ReviewVocabularyResponse, GetBillingStatusResponse,
} from "@workspace/api-zod";
import { getLearner, profileOf } from "../lib/learner";
import { getCatalog, getWordQueue, progressSummary } from "../lib/learning";
import { gradeAnswers, nextReviewInterval, boundedActiveSeconds } from "../lib/scoring";
import { getAuth } from "@clerk/express";
import { getAppSettings, getAccessState } from "../lib/app-settings";

const router: IRouter = Router();
router.get("/profile", async (req, res) => {
  res.json(GetProfileResponse.parse(profileOf(await getLearner(req, res))));
});
router.put("/profile", async (req, res) => {
  const parsed = SaveProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "بيانات الحساب غير صالحة." }); return; }
  try { new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone }).format(); }
  catch { res.status(400).json({ error: "المنطقة الزمنية غير صالحة." }); return; }
  if (!/^\d{2}:\d{2}$/.test(parsed.data.reminderTime) || Number(parsed.data.reminderTime.slice(0, 2)) > 23 || Number(parsed.data.reminderTime.slice(3)) > 59) {
    res.status(400).json({ error: "وقت التذكير غير صالح." }); return;
  }
  const learner = await getLearner(req, res);
  await db.transaction(async tx => {
    await tx.update(learners).set({ preferences: parsed.data }).where(eq(learners.id, learner.id));
    if (!parsed.data.retainChat) await tx.delete(chatMessages).where(eq(chatMessages.learnerId, learner.id));
  });
  res.json(GetProfileResponse.parse({ ...parsed.data, id: learner.id, isGuest: learner.isGuest, joinedAt: learner.joinedAt.toISOString() }));
});
router.get("/courses", async (req, res) => {
  const learner = await getLearner(req, res);
  res.json(GetCoursesResponse.parse(await getCatalog(learner.id)));
});
router.get("/lessons/:id", async (req, res) => {
  const p = GetLessonParams.safeParse(req.params);
  if (!p.success) { res.status(400).json({ error: "Invalid lesson" }); return; }
  const learner = await getLearner(req, res);
  const catalog = await getCatalog(learner.id);
  const lesson = catalog.flatMap(c => c.lessons).find(l => l.id === p.data.id);
  if (!lesson) { res.status(404).json({ error: "الدرس غير موجود." }); return; }
  await db.insert(lessonStarts).values({ learnerId: learner.id, lessonId: lesson.id })
    .onConflictDoNothing();
  res.json(GetLessonResponse.parse(lesson));
});
router.post("/lessons/:id/complete", async (req, res) => {
  const p = CompleteLessonParams.safeParse(req.params);
  const body = CompleteLessonBody.safeParse(req.body);
  if (!p.success || !body.success) { res.status(400).json({ error: "إجابات غير صالحة." }); return; }
  const learner = await getLearner(req, res);
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, p.data.id));
  if (!lesson?.active) { res.status(404).json({ error: "الدرس غير موجود أو تم إخفاؤه بواسطة الإدارة." }); return; }
  const keys = lesson.answerKey as { correctIndex: number; explanation: string }[];
  const exercises = (lesson.content as LessonContent).exercises;
  if (body.data.answers.length !== keys.length || body.data.answers.some((v, i) => v >= exercises[i]!.options.length)) {
    res.status(400).json({ error: "أجب عن جميع الأسئلة أولاً." }); return;
  }
  const { feedback, score, passed } = gradeAnswers(body.data.answers, keys);
  const [start] = await db.select().from(lessonStarts).where(and(eq(lessonStarts.learnerId, learner.id), eq(lessonStarts.lessonId, lesson.id)));
  const activeSeconds = boundedActiveSeconds(body.data.activeSeconds, start?.startedAt);
  const [last] = await db.select().from(attempts).where(and(eq(attempts.learnerId, learner.id), eq(attempts.lessonId, lesson.id))).orderBy(desc(attempts.createdAt)).limit(1);
  const duplicate = last && Date.now() - last.createdAt.getTime() < 10_000 && JSON.stringify(last.answers) === JSON.stringify(body.data.answers);
  let xpEarned = 0;
  if (!duplicate) {
    await db.transaction(async tx => {
      await tx.insert(attempts).values({ learnerId: learner.id, lessonId: lesson.id, answers: body.data.answers, score, activeSeconds });
      await tx.update(lessonStarts).set({ startedAt: new Date() }).where(and(eq(lessonStarts.learnerId, learner.id), eq(lessonStarts.lessonId, lesson.id)));
      if (passed) {
        const inserted = await tx.insert(completions).values({ learnerId: learner.id, lessonId: lesson.id, score }).onConflictDoNothing().returning();
        xpEarned = inserted.length ? 30 : 0;
        for (const word of (lesson.content as LessonContent).words) {
          await tx.insert(reviews).values({ learnerId: learner.id, wordId: word.id }).onConflictDoNothing();
        }
      }
    });
  }
  res.json(CompleteLessonResponse.parse({ score, passed, xpEarned, feedback }));
});
router.get("/progress/summary", async (req, res) => {
  const learner = await getLearner(req, res);
  res.json(GetProgressResponse.parse(await progressSummary(learner.id, learner.preferences.timezone)));
});
router.get("/study-plan", async (req, res) => {
  const learner = await getLearner(req, res);
  const catalog = await getCatalog(learner.id);
  const goals = learner.preferences.goals.join(" ").toLowerCase();
  const preferred = /travel|سفر/.test(goals) ? "travel" : /work|عمل/.test(goals) ? "professional" : /reading|قراءة/.test(goals) ? "reading" : /family|عائلة/.test(goals) ? "reading" : "speaking";
  const ordered = [...catalog.slice(0, 2), ...catalog.slice(2).sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred))];
  const plan = Array.from({ length: 180 }, (_, i) => {
    const month = Math.floor(i / 30) + 1;
    const course = ordered[month - 1]!;
    const day = i % 30;
    const lesson = course.lessons[day % course.lessons.length];
    const isNew = day < course.lessons.length;
    return { day: i + 1, month, title: isNew ? lesson!.titleAr : day % 7 === 6 ? "مراجعة أسبوعية وتقييم ذاتي" : `مراجعة وتطبيق: ${lesson!.titleAr}`, lessonId: lesson?.id ?? null, type: isNew ? "lesson" : "review", completed: isNew && !!lesson?.completed };
  });
  res.json(GetStudyPlanResponse.parse(plan));
});
router.get("/vocabulary", async (req, res) => {
  res.json(GetVocabularyResponse.parse(await getWordQueue((await getLearner(req, res)).id)));
});
router.post("/vocabulary/:id/review", async (req, res) => {
  const p = ReviewVocabularyParams.safeParse(req.params);
  const body = ReviewVocabularyBody.safeParse(req.body);
  if (!p.success || !body.success) { res.status(400).json({ error: "Invalid review" }); return; }
  const learner = await getLearner(req, res);
  const words = await getWordQueue(learner.id);
  const word = words.find(w => w.id === p.data.id);
  if (!word) { res.status(404).json({ error: "الكلمة غير موجودة." }); return; }
  if (!word.due) { res.json(ReviewVocabularyResponse.parse(word)); return; }
  const interval = nextReviewInterval(body.data.remembered, word.interval);
  const nextReview = new Date(Date.now() + (interval ? interval * 86400000 : 10 * 60000));
  await db.insert(reviews).values({ learnerId: learner.id, wordId: word.id, interval, nextReview, remembered: body.data.remembered })
    .onConflictDoUpdate({ target: [reviews.learnerId, reviews.wordId], set: { interval, nextReview, remembered: body.data.remembered } });
  res.json(ReviewVocabularyResponse.parse({ ...word, interval, due: false }));
});
router.get("/billing/status", async (req, res) => {
  const settings = await getAppSettings();
  const access = await getAccessState(getAuth(req).userId, settings);
  res.json(GetBillingStatusResponse.parse({ ...access, configured: false, message: access.plan === "complimentary"
    ? "لديك وصول مجاني مؤقت من الإدارة، وليس اشتراكاً مدفوعاً. لا يتم تحصيل أي رسوم."
    : "الاشتراك المدفوع غير مفعّل. لا يتم تحصيل أي رسوم. يلزم إعداد Polar والتحقق من الدفع قبل تفعيل Premium." }));
});
router.get("/account/export", async (req, res) => {
  const learner = await getLearner(req, res);
  const [history, vocabulary, messages] = await Promise.all([
    db.select().from(attempts).where(eq(attempts.learnerId, learner.id)),
    db.select().from(reviews).where(eq(reviews.learnerId, learner.id)),
    db.select().from(chatMessages).where(eq(chatMessages.learnerId, learner.id)).orderBy(asc(chatMessages.createdAt)),
  ]);
  res.json({ profile: profileOf(learner), progress: await progressSummary(learner.id, learner.preferences.timezone), history, vocabulary, messages });
});
router.delete("/account", async (req, res) => {
  const learner = await getLearner(req, res);
  await db.delete(learners).where(eq(learners.id, learner.id));
  res.clearCookie("hudhud_guest", { path: "/api" });
  res.clearCookie("hudhud_lesson_start", { path: "/api" });
  res.json({ status: "Learning data deleted. Clerk identity, if any, remains managed separately." });
});
export default router;
