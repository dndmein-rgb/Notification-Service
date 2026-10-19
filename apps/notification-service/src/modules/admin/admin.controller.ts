import { asyncHandler } from "@notification/shared-utils";
import type { Request, Response } from "express";
import type { ListDeliveriesQuery } from "./admin.schema.js";
import { adminService } from "./admin.container.js";

export const listDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const query = res.locals.validatedQuery as ListDeliveriesQuery;
  const result = await adminService.listDeliveries({
    status: query.status as any,
    channel: query.channel,
    page: query.page,
    limit: query.limit,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

export const retryDelivery = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await adminService.retryDelivery(id);

  res.status(200).json({
    success: true,
    message: "Delivery re-queued for retry",
    data: result,
  });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getStats();
  res.status(200).json({ success: true, data: stats });
});