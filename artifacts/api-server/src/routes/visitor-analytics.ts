import { Router, type IRouter } from "express";
import { db, visitorPageviews } from "@workspace/db";
import { RecordVisitorPageviewBody } from "@workspace/api-zod";
import { HttpError } from "../lib/http-error";
import { classifyVisitorBrowser, classifyVisitorDevice, normalizeVisitorCountry, pruneExpiredVisitorPageviews } from "../lib/visitor-analytics";

const router: IRouter = Router();

router.post("/", async (req, res): Promise<void> => {
  const parsed = RecordVisitorPageviewBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "بيانات زيارة غير صالحة.");

  await db.insert(visitorPageviews).values({
    ...parsed.data,
    country: normalizeVisitorCountry(req.get("x-replit-ip-country")),
    device: classifyVisitorDevice(req.get("user-agent")),
    browser: classifyVisitorBrowser(req.get("user-agent")),
  }).onConflictDoNothing();

  await pruneExpiredVisitorPageviews();
  res.status(202).end();
});

export default router;
