import { NotFoundError, ValidationError } from "@notification/shared-utils";
import type { DeliveryChannel } from "@notification/database";
import type { NotificationInterface } from "./notification.interface.js";
import type {
  BatchCreateNotificationInput,
  CreateNotificationInput,
} from "./notification.schema.js";
import { enqueueDelivery } from "../../infrastructure/queue.js";
import { logger } from "../../config/logger.js";
import { preferenceService } from "../preference/preference.container.js";
import { notificationsCreatedTotal } from "../../infrastructure/metrics.js";

const DEFAULT_CHANNELS: DeliveryChannel[] = ["IN_APP", "EMAIL"];

export class NotificationService {
  constructor(private readonly repo: NotificationInterface) {}

  /**
   * Create one notification.
   * If idempotencyKey is set and already used → return existing (no new jobs).
   */
  async create(input: CreateNotificationInput, idempotencyKey?: string | null) {
    const tenantId = input.tenantId ?? null;
    if (idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(
        idempotencyKey,
        tenantId,
      );
      if (existing) {
        logger.info("Idempotent hit — returning existing notification", {
          notificationId: existing.id,
          idempotencyKey,
        });
        return { notification: existing, idempotentReplay: true };
      }
    }

    const requested = input.channels?.length
      ? input.channels
      : DEFAULT_CHANNELS;

    const channels = await preferenceService.resolveChannels(
      input.userId,
      requested,
    );

    try {
      const notification = await this.repo.create({
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? undefined,
        status: "PENDING",
        channels,
        idempotencyKey: idempotencyKey ?? null,
      });

      // 2. Enqueue one job per delivery (after TX committed)
      for (const delivery of notification.deliveries) {
        await enqueueDelivery(delivery.id);
      }

      notificationsCreatedTotal.inc({
        tenant_id: input.tenantId ?? "none",
      });

      logger.info("Notification created and jobs enqueued", {
        notificationId: notification.id,
        deliveryIds: notification.deliveries.map((d) => d.id),
      });

      // Status is still PENDING; worker will move it to DELIVERED / PARTIAL / FAILED
      return { notification, idempotentReplay: false };
    } catch (err: unknown) {
      // Concurrent duplicate key → treat as replay
      if (
        idempotencyKey &&
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        const existing = await this.repo.findByIdempotencyKey(
          idempotencyKey,
          tenantId,
        );
        if (existing) {
          return { notification: existing, idempotentReplay: true };
        }
      }
      throw err;
    }
  }

  async createBatch(
    input: BatchCreateNotificationInput,
    // optional single key for whole batch is unusual; per-item keys via headers not standard —
    // batch items rely on normal create without shared key unless you extend later
  ) {
    const results: Array<{
      index: number;
      success: boolean;
      data?: unknown;
      error?: string;
    }> = [];

    for (let i = 0; i < input.notifications.length; i++) {
      try {
        const { notification, idempotentReplay } = await this.create(
          input.notifications[i],
          null,
        );
        results.push({
          index: i,
          success: true,
          data: { ...notification, idempotentReplay },
        });
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      total: input.notifications.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
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
