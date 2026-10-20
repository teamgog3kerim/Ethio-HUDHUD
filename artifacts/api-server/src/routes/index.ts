import { Router, type IRouter } from "express";
import healthRouter from "./health";
import learningRouter from "./learning";
import tutorRouter from "./tutor";
import renewalRouter from "./renewal";
import adminRouter from "./admin";
import { enforceAccountStatus } from "../lib/admin-auth";
import { getAppSettings } from "../lib/app-settings";
import { HttpError } from "../lib/http-error";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/app-settings", async (_req, res) => {
  const { defaultDailyGoal: _privateDefault, ...settings } = await getAppSettings();
  res.json(settings);
});
router.use(enforceAccountStatus);
router.use("/admin", adminRouter);
router.use(async (req, _res, next) => {
  if (req.method === "POST") {
    const settings = await getAppSettings();
    if (!settings.learningEnabled && (/^\/lessons\/[^/]+\/complete$/.test(req.path) || /^\/vocabulary\/[^/]+\/review$/.test(req.path))) {
      throw new HttpError(503, "تم إيقاف التمارين والمراجعات مؤقتاً بواسطة الإدارة.");
    }
    if (!settings.aiEnabled && req.path === "/ai/chat") throw new HttpError(503, "المعلّم الآلي متوقف مؤقتاً بواسطة الإدارة.");
  }
  next();
});
router.use(learningRouter);
router.use(renewalRouter);
router.use(tutorRouter);

export default router;
