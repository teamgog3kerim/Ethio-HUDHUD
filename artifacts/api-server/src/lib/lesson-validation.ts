import { z } from "zod/v4";
import { isArabicPronunciation } from "@workspace/db/pronunciation";
export const lessonContentSchema = z.object({
  titleAr: z.string().trim().min(1).max(150), titleEn: z.string().trim().min(1).max(150),
  titleAm: z.string().trim().min(1).max(150), minutes: z.number().int().min(1).max(180),
  objective: z.string().trim().min(3).max(1000), explanation: z.string().trim().min(10).max(10000),
  words: z.array(z.object({
    id: z.string().min(1).max(150), amharic: z.string().min(1).max(300),
    arabic: z.string().min(1).max(300), english: z.string().min(1).max(300),
    transliteration: z.string().trim().min(1).max(300).refine(isArabicPronunciation, {
      message: "اكتب النطق التقريبي بحروف عربية، لا بحروف لاتينية.",
    }),
    due: z.boolean().default(true), interval: z.number().int().min(0).default(0),
  })).min(1).max(100),
  exercises: z.array(z.object({
    id: z.string().min(1).max(150), type: z.string().min(1).max(60),
    prompt: z.string().min(1).max(1000), options: z.array(z.string().min(1).max(500)).min(2).max(9),
  })).min(1).max(50),
}).superRefine((content, ctx) => {
  for (const key of ["words", "exercises"] as const) {
    if (new Set(content[key].map(row => row.id)).size !== content[key].length) ctx.addIssue({ code: "custom", message: `Duplicate ${key} identifiers` });
  }
});
