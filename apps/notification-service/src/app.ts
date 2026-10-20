import express from "express";

import { requestLogger } from "./middlewares/req.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { metricsMiddleware } from "./middlewares/metrics.middleware.js";

import adminRoutes from "./modules/admin/admin.route.js";
import notificationRoutes from "./modules/notification/notification.route.js";
import preferenceRoutes from "./modules/preference/preference.route.js";

import { getReadyStatus } from "./infrastructure/ready.js";
import { metricsText } from "./infrastructure/metrics.js";

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "notification-service",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Liveness-style deep check.
   * 200 if Postgres + Redis OK; 503 otherwise.
   */
  app.get("/ready", async (_req, res) => {
    const result = await getReadyStatus({ includeKafka: false });
    res.status(result.ready ? 200 : 503).json({
      status: result.ready ? "ready" : "not_ready",
      service: "notification-service",
      checks: result.checks,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(await metricsText());
  });

  app.use("/admin", adminRoutes);
  app.use("/notifications", notificationRoutes);
  app.use("/users/:userId/preferences", preferenceRoutes);

  app.use(errorMiddleware);
  return app;
}