import { asyncHandler } from "@notification/shared-utils";
import type { Request, Response } from "express";
import type {
  CreateNotificationInput,
  GetUserNotificationsQuery,
  BatchCreateNotificationInput,
} from "./notification.schema.js";
import { notificationService } from "./notification.container.js";

export const createNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body as CreateNotificationInput;
    const idempotencyKey =
      req.header("Idempotency-Key") ?? req.header("idempotency-key") ?? null;

    const { notification, idempotentReplay } = await notificationService.create(
      body,
      idempotencyKey,
    );

    res.status(idempotentReplay ? 200 : 201).json({
      success: true,
      message: idempotentReplay
        ? "Notification already created (idempotent replay)"
        : "Notification created successfully",
      data: notification,
      meta: { idempotentReplay },
    });
  },
);

export const batchCreateNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body as BatchCreateNotificationInput;
    const result = await notificationService.createBatch(body);

    res.status(207).json({
      success: result.failed === 0,
      message: "Batch processed",
      data: result,
    });
  },
);

export const userNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit, page, userId, unreadOnly, tenantId } = res.locals
      .validatedQuery as GetUserNotificationsQuery;

    const result = await notificationService.getUserNotifications({
      limit,
      page,
      userId,
      tenantId,
      unreadOnly,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  },
);

export const findById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await notificationService.findNotificationById(id);
  res.status(200).json({
    success: true,
    message: "Notification fetched successfully",
    data: result,
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await notificationService.markAsRead(id);
  res.status(200).json({
    success: true,
    message: "Notification read successfully",
    data: result,
  });
});