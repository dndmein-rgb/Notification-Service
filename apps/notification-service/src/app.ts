import express from "express";

import { requestLogger } from "./middlewares/req.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

import adminRoutes from "./modules/admin/admin.route.js"
import notificationRoutes from "./modules/notification/notification.route.js"
import preferenceRoutes from "./modules/preference/preference.route.js"

export function createApp() {
  const app = express();

  app.use(corsMiddleware)
  app.use(express.json());
  app.use(requestLogger)

  
  app.use("/admin", adminRoutes);
  app.use("/notifications",notificationRoutes)
  app.use("/users/:userId/preferences", preferenceRoutes);
  
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