import { asyncHandler } from "@notification/shared-utils";
import type { Request, Response } from "express";
import type { UpdatePreferencesBody } from "./preference.schema.js";
import { preferenceService } from "./preference.container.js";

export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const result = await preferenceService.getEffective(userId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const body = req.body as UpdatePreferencesBody;

  const result = await preferenceService.update(userId, body.preferences);

  res.status(200).json({
    success: true,
    message: "Preferences updated",
    data: result,
  });
});