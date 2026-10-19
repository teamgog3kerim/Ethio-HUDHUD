import type { Course, Lesson } from "./generated/api.schemas";

export const learningStages = [
  { id: "beginner", titleAr: "مبتدئ", titleEn: "Beginner", months: [1, 2] },
  { id: "intermediate", titleAr: "متوسط", titleEn: "Intermediate", months: [3, 4] },
  { id: "advanced", titleAr: "متقدم", titleEn: "Advanced", months: [5, 6] },
] as const;

export function stageForMonth(month: number) {
  return learningStages.find(stage => (stage.months as readonly number[]).includes(month)) ?? learningStages[2];
}

export function buildLearningPath(courses: Course[]) {
  const months = [...courses].sort((a, b) => a.month - b.month).map(course => {
    const total = course.lessons.length;
    const completed = course.lessons.filter(lesson => lesson.completed).length;
    const weeks = Array.from({ length: 4 }, (_, index) => ({
      number: (course.month - 1) * 4 + index + 1,
      lessons: course.lessons.filter((_, i) => Math.min(3, Math.floor(i * 4 / Math.max(1, total))) === index),
    }));
    return { course, stage: stageForMonth(course.month), weeks, total, completed, percent: total ? Math.round(completed / total * 100) : 0 };
  });
  const lessons = months.flatMap(month => month.course.lessons);
  const completed = lessons.filter(lesson => lesson.completed).length;
  return {
    months, lessons, completed, total: lessons.length,
    percent: lessons.length ? Math.round(completed / lessons.length * 100) : 0,
    nextLesson: lessons.find(lesson => !lesson.completed) ?? null,
  };
}

export function getLessonPosition(courses: Course[], id: string) {
  const path = buildLearningPath(courses);
  const index = path.lessons.findIndex(lesson => lesson.id === id);
  if (index < 0) return null;
  const month = path.months.find(m => m.course.lessons.some(lesson => lesson.id === id))!;
  return {
    current: path.lessons[index]!,
    previous: path.lessons[index - 1] as Lesson | undefined,
    next: path.lessons[index + 1] as Lesson | undefined,
    course: month.course, stage: month.stage,
    week: month.weeks.find(w => w.lessons.some(lesson => lesson.id === id))!.number,
    index, total: path.total, completed: path.completed,
  };
}
