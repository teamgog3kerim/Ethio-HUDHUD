import { Router, type IRouter } from "express";
import healthRouter from "./health";
import learningRouter from "./learning";
import tutorRouter from "./tutor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(learningRouter);
router.use(tutorRouter);

export default router;
