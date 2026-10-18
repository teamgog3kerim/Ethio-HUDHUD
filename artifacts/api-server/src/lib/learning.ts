import { db, courses, lessons, completions, attempts, reviews, type LessonContent } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { dateInZone } from "./learner";
import { arabicLessonContent, arabicLearningText, arabicPronunciation } from "@workspace/db/pronunciation";

export async function getCatalog(learnerId: string) {
  const [allCourses, allLessons, done] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.month)),
    db.select().from(lessons).where(eq(lessons.active, true)).orderBy(asc(lessons.sequence)),
    db.select().from(completions).where(eq(completions.learnerId, learnerId)),
  ]);
  const ids = new Set(done.map(d => d.lessonId));
  return allCourses.map(c => ({
    ...c, completedCount: allLessons.filter(l => l.courseId === c.id && ids.has(l.id)).length,
    lessons: allLessons.filter(l => l.courseId === c.id).map(l => ({
      ...arabicLessonContent(l.content as LessonContent), id: l.id, courseId: l.courseId,
      reviewStatus: l.reviewStatus, completed: ids.has(l.id),
    })),
  }));
}
export async function getWordQueue(learnerId: string) {
  const [all, scheduled] = await Promise.all([
    db.select().from(lessons).where(eq(lessons.active, true)).orderBy(asc(lessons.sequence)),
    db.select().from(reviews).where(eq(reviews.learnerId, learnerId)),
  ]);
  const uniqueWords = new Map<string, LessonContent["words"][number]>();
  for (const l of all) for (const w of (l.content as LessonContent).words) uniqueWords.set(w.id, w);
  return [...uniqueWords.values()].map(w => {
    const review = scheduled.find(s => s.wordId === w.id);
    return { ...w, arabic: arabicLearningText(w.arabic),
      english: w.english.startsWith("syllable ") ? `syllable ${arabicPronunciation(w.english.slice(9))}` : w.english,
      transliteration: arabicPronunciation(w.transliteration),
      due: !review || review.nextReview <= new Date(), interval: review?.interval ?? 0 };
  });
}
export async function progressSummary(learnerId: string, zone: string) {
  const [done, history, allLessons, vocabulary] = await Promise.all([
    db.select().from(completions).where(eq(completions.learnerId, learnerId)),
    db.select().from(attempts).where(eq(attempts.learnerId, learnerId)).orderBy(asc(attempts.createdAt)),
    db.select().from(lessons),
    db.select().from(reviews).where(eq(reviews.learnerId, learnerId)),
  ]);
  const dayMap = new Map<string, number>();
  for (const h of history) {
    const date = dateInZone(h.createdAt, zone);
    dayMap.set(date, (dayMap.get(date) ?? 0) + h.activeSeconds / 60);
  }
  const today = dateInZone(new Date(), zone);
  const activity = Array.from({ length: 7 }, (_, i) => {
    const date = dateInZone(new Date(Date.now() - (6 - i) * 86400000), zone);
    return { date, minutes: Math.round((dayMap.get(date) ?? 0) * 10) / 10 };
  });
  const activeDates = new Set(history.filter(h => h.activeSeconds >= 30 || h.score >= 75).map(h => dateInZone(h.createdAt, zone)));
  let streak = 0;
  let offset = activeDates.has(today) ? 0 : 1;
  for (; offset < 3660; offset++) {
    if (!activeDates.has(dateInZone(new Date(Date.now() - offset * 86400000), zone))) break;
    streak++;
  }
  const completedWords = new Set<string>();
  for (const d of done) {
    const lesson = allLessons.find(l => l.id === d.lessonId);
    for (const w of (lesson?.content as LessonContent | undefined)?.words ?? []) completedWords.add(w.id);
  }
  for (const w of vocabulary.filter(v => v.remembered)) completedWords.add(w.wordId);
  return {
    lessonsCompleted: done.length, totalLessons: allLessons.length, vocabularyLearned: completedWords.size,
    totalMinutes: Math.round(history.reduce((n, a) => n + a.activeSeconds, 0) / 6) / 10,
    todayMinutes: Math.round((dayMap.get(today) ?? 0) * 10) / 10, streak, xp: done.length * 30,
    averageScore: history.length ? Math.round(history.reduce((n, a) => n + a.score, 0) / history.length) : 0,
    activity, recentLessons: done.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()).slice(0, 5).map(d => d.lessonId),
  };
}
