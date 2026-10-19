import express from "express";
import { requestLogger } from "./middlewares/req.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

import notificationRoutes from "./modules/notification/notification.route.js"
import adminRoutes from "./modules/admin/admin.route.js"

export function createApp() {
  const app = express();

  app.use(corsMiddleware)
  app.use(express.json());
  app.use(requestLogger)

  
  app.use("/notifications",notificationRoutes)
  app.use("/admin", adminRoutes);
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "notification-service",
      timestamp: new Date().toISOString(),
    });
  });
  app.use(errorMiddleware)
  return app;
}