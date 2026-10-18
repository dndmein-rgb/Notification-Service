// notification.service.ts

import {
  NotFoundError,
  ValidationError,
} from "@notification/shared-utils";
import type { DeliveryChannel } from "@notification/database";
import type { NotificationInterface } from "./notification.interface.js";
import type { CreateNotificationInput } from "./notification.schema.js";
import { enqueueDelivery } from "../../infrastructure/queue.js";
import { logger } from "../../config/logger.js";

const DEFAULT_CHANNELS: DeliveryChannel[] = ["IN_APP", "EMAIL"];

export class NotificationService {
  constructor(private readonly repo: NotificationInterface) {}

  async create(input: CreateNotificationInput) {
    // 1. Persist Notification + Deliveries (QUEUED) in one TX
    const notification = await this.repo.create({
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? undefined,
      status: "PENDING",
      channels: DEFAULT_CHANNELS,
    });

    // 2. Enqueue one job per delivery (after TX committed)
    for (const delivery of notification.deliveries) {
      await enqueueDelivery(delivery.id);
    }

    logger.info("Notification created and jobs enqueued", {
      notificationId: notification.id,
      deliveryIds: notification.deliveries.map((d) => d.id),
    });

    // Status is still PENDING; worker will move it to DELIVERED / PARTIAL / FAILED
    return notification;
  }

  async getUserNotifications(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }) {
    const { userId, tenantId, page, limit, unreadOnly } = params;
    if (!userId) throw new ValidationError("userId is required");

    const { data, total } = await this.repo.findByUserId({
      userId,
      tenantId,
      page,
      limit,
      unreadOnly,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findNotificationById(id: string) {
    if (!id) throw new ValidationError("Notification id is required");
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundError("Notification", id);
    return notification;
  }

  async findNotificationByIdWithDeliveries(id: string) {
    if (!id) throw new ValidationError("Notification id is required");
    const notification = await this.repo.findByIdWithDeliveries(id);
    if (!notification) throw new NotFoundError("Notification", id);
    return notification;
  }

  async markAsRead(id: string) {
    if (!id) throw new ValidationError("Notification id is required");
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundError("Notification", id);
    if (notification.readAt) return notification;
    return this.repo.markAsRead(id);
  }
}