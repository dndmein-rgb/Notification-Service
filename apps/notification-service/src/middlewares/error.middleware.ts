import type { Request, Response, NextFunction } from "express";
import { AppError } from "@notification/shared-utils";
import { logger } from "../config/logger.js";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {

  if (err instanceof AppError) {
    logger.warn({ err, code: err.code }, err.message);
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "P2025") {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Resource not found" },
      });
      return;
    }
    if (code === "P2002") {
      res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "Unique constraint violation" },
      });
      return;
    }
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}