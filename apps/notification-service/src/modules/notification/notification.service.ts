import {
  NotFoundError,
  ValidationError,
} from "@notification/shared-utils";
import type {
  Delivery,
  DeliveryChannel,
  NotificationStatus,
} from "@notification/database";
import type { NotificationInterface } from "./notification.interface.js";
import type { CreateNotificationInput } from "./notification.schema.js";
import type { ChannelAdapter } from "./adapters/channel-adapter.interface.js";
import { logger } from "../../config/logger.js";

const DEFAULT_CHANNELS: DeliveryChannel[] = ["IN_APP", "EMAIL"];

export class NotificationService {
  constructor(
    private readonly repo: NotificationInterface,
    private readonly adapters: Map<DeliveryChannel, ChannelAdapter>,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE (Phase 2 – sync fan-out)
  // ─────────────────────────────────────────────
  async create(input: CreateNotificationInput) {
    // 1. Persist Notification + Deliveries (QUEUED) in one transaction
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

    // 2. Process each delivery synchronously
    for (const delivery of notification.deliveries) {
      await this.processDelivery(notification, delivery);
    }

    // 3. Roll-up Notification status from all deliveries
    const finalStatus = await this.rollUpStatus(notification.id);
    await this.repo.updateNotificationStatus(notification.id, finalStatus);

    // 4. Return the full picture
    const result = await this.repo.findByIdWithDeliveries(notification.id);
    if (!result) {
      // should never happen
      throw new NotFoundError("Notification", notification.id);
    }

    logger.info("Notification created and processed", {
      notificationId: result.id,
      status: result.status,
      deliveries: result.deliveries.map((d) => ({
        channel: d.channel,
        status: d.status,
      })),
    });

    return result;
  }

  // ─────────────────────────────────────────────
  // Delivery processing helper
  // ─────────────────────────────────────────────
  private async processDelivery(
    notification: { id: string; userId: string; title: string; body: string; data: unknown },
    delivery: Delivery,
  ): Promise<void> {
    const adapter = this.adapters.get(delivery.channel);

    if (!adapter) {
      await this.repo.updateDelivery(delivery.id, {
        status: "FAILED",
        attempts: delivery.attempts + 1,
        lastError: `No adapter registered for channel ${delivery.channel}`,
      });
      return;
    }

    // Mark as SENDING
    await this.repo.updateDelivery(delivery.id, {
      status: "SENDING",
      attempts: delivery.attempts + 1,
    });

    try {
      const result = await adapter.send({
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? undefined,
        // toEmail can be added later when you have a user service
      });

      await this.repo.updateDelivery(delivery.id, {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.providerMessageId ?? null,
        lastError: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Delivery failed", {
        notificationId: notification.id,
        deliveryId: delivery.id,
        channel: delivery.channel,
        error: message,
      });

      await this.repo.updateDelivery(delivery.id, {
        status: "FAILED",
        lastError: message,
      });
    }
  }

  // ─────────────────────────────────────────────
  // Status roll-up
  // ─────────────────────────────────────────────
  private async rollUpStatus(notificationId: string): Promise<NotificationStatus> {
    const deliveries = await this.repo.getDeliveriesByNotificationId(notificationId);

    if (deliveries.length === 0) {
      return "FAILED";
    }

    const allSent = deliveries.every((d) => d.status === "SENT");
    const allFailed = deliveries.every(
      (d) => d.status === "FAILED" || d.status === "DEAD",
    );
    const anySent = deliveries.some((d) => d.status === "SENT");
    const anyPending = deliveries.some(
      (d) => d.status === "QUEUED" || d.status === "SENDING",
    );

    if (anyPending) return "PENDING";
    if (allSent) return "DELIVERED";
    if (allFailed) return "FAILED";
    if (anySent) return "PARTIAL"; // mixed success + failure
    return "FAILED";
  }

  // ─────────────────────────────────────────────
  // Existing read APIs (unchanged behaviour)
  // ─────────────────────────────────────────────
  async getUserNotifications(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }) {
    const { userId, tenantId, page, limit, unreadOnly } = params;

    if (!userId) {
      throw new ValidationError("userId is required");
    }

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
    if (!id) {
      throw new ValidationError("Notification id is required");
    }

    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }
    return notification;
  }

  /** Optional: return notification + deliveries (useful for debugging) */
  async findNotificationByIdWithDeliveries(id: string) {
    if (!id) {
      throw new ValidationError("Notification id is required");
    }

    const notification = await this.repo.findByIdWithDeliveries(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }
    return notification;
  }

  async markAsRead(id: string) {
    if (!id) {
      throw new ValidationError("Notification id is required");
    }

    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }

    // Idempotent: already read → just return it
    if (notification.readAt) {
      return notification;
    }

    return this.repo.markAsRead(id);
  }
}