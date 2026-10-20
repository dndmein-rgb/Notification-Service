import type { RequestHandler } from "express";
import { httpRequestDuration } from "../infrastructure/metrics.js";

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;
    end({
      method: req.method,
      route,
      status_code: String(res.statusCode),
    });
  });
  next();
};