import { db, pool } from "./index";
import { courses, lessons } from "./schema";
import { courseSeed, lessonSeed } from "./seed-data";

export async function seedCurriculum() {
  await db.transaction(async tx => {
    for (const course of courseSeed) await tx.insert(courses).values(course).onConflictDoNothing();
    for (const lesson of lessonSeed) await tx.insert(lessons).values(lesson).onConflictDoNothing();
  });
}
if (process.argv[1]?.endsWith("/seed.ts")) {
  await seedCurriculum();
  await pool.end();
}
