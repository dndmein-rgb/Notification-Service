import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "@notification/shared-utils";
import { config } from "../config/index.js";

export function adminAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void { 
  const key = req.header("X-API-Key") ?? req.header("x-api-key")
  if (!key || key !== config.ADMIN_API_KEY) {
      next(new UnauthorizedError("Invalid or missing X-API-Key"));
      return;
    }
  
    next();
}