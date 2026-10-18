import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
const allowedOrigins = new Set([
  process.env.REPLIT_DEV_DOMAIN,
  process.env.REPLIT_EXPO_DEV_DOMAIN,
  ...(process.env.REPLIT_DOMAINS ?? "").split(","),
].filter(Boolean).map(host => `https://${host}`));
app.use(cors({ credentials: true, origin: (origin, callback) => callback(null, !!origin && allowedOrigins.has(origin)) }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api", (req, res, next) => {
  const site = req.get("sec-fetch-site");
  const origin = req.get("origin");
  const requestHost = getClerkProxyHost(req);
  const sameOrigin = !origin || origin === `https://${requestHost}` || origin === `http://${requestHost}` || allowedOrigins.has(origin);
  const validBearer = req.get("authorization")?.startsWith("Bearer ") && !!getAuth(req).userId;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !validBearer && (!sameOrigin || (site === "cross-site" && !origin))) {
    res.status(403).json({ error: "Cross-site request rejected" }); return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", router);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ err }, "Request failed");
  res.status(500).json({ error: "تعذر إتمام الطلب. حاول مرة أخرى." });
});

export default app;
