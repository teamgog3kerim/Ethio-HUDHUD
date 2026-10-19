type PlanCourse = { month: number; lessons: { id: string; titleAr: string; completed: boolean }[] };

// Keep calendar order consistent with the Learn page, spreading new material
// across four suggested weeks and leaving days for revision and role practice.
export function buildStudyPlan(courses: PlanCourse[]) {
  const ordered = [...courses].sort((a, b) => a.month - b.month);
  return Array.from({ length: 180 }, (_, i) => {
    const month = Math.floor(i / 30) + 1;
    const day = i % 30;
    const lessons = ordered.find(c => c.month === month)?.lessons ?? [];
    const newIndex = day < 28 ? lessons.findIndex((_, index) => Math.floor(index * 28 / Math.max(1, lessons.length)) === day) : -1;
    const reviewIndex = Math.min(lessons.length - 1, Math.floor(day * lessons.length / 28));
    const lesson = lessons[newIndex >= 0 ? newIndex : reviewIndex];
    const isNew = newIndex >= 0;
    return {
      day: i + 1, month, lessonId: lesson?.id ?? null,
      title: isNew ? lesson!.titleAr : day >= 28 ? "مراجعة الشهر وتطبيق المحادثات" : day % 7 === 6 ? "مراجعة أسبوعية وتقييم ذاتي" : lesson ? `مراجعة وتطبيق: ${lesson.titleAr}` : "مراجعة وممارسة حرة",
      type: isNew ? "lesson" : "review", completed: isNew && !!lesson?.completed,
    };
  });
}
