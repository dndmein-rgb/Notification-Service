import type { Job } from "bullmq";
import type {
  DeliveryChannel,
  NotificationStatus,
} from "@notification/database";
import { prisma } from "../infrastructure/prisma.js";
import {
  enqueueDelivery,
  type ProcessDeliveryJob,
} from "../infrastructure/queue.js";
import type { ChannelAdapter } from "../adapters/channel-adapter.interface.js";
import { logger } from "../config/logger.js";
import { calculateBackoffMs } from "@notification/shared-utils";

export function createDeliveryProcessor(
  adapters: Map<DeliveryChannel, ChannelAdapter>,
) {
  return async function processDelivery(job: Job<ProcessDeliveryJob>) {
    const { deliveryId } = job.data;

    logger.info("Processing delivery job", {
      jobId: job.id,
      deliveryId,
    });

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });

    if (!delivery) {
      logger.warn("Delivery not found, skipping", { deliveryId });
      return;
    }

    // Idempotency: only process QUEUED
    if (delivery.status !== "QUEUED") {
      logger.info("Delivery already processed, skipping", {
        deliveryId,
        status: delivery.status,
      });
      return;
    }

    // CAS: QUEUED → SENDING, attempts++
    const cas = await prisma.delivery.updateMany({
      where: { id: deliveryId, status: "QUEUED" },
      data: {
        status: "SENDING",
        attempts: { increment: 1 },
      },
    });

    if (cas.count === 0) {
      logger.info("Lost CAS race, skipping", { deliveryId });
      return;
    }

    const updated = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    const currentAttempts = updated?.attempts ?? delivery.attempts + 1;
    const maxAttempts = delivery.maxAttempts;

    const adapter = adapters.get(delivery.channel);
    if (!adapter) {
      await handleFailure(
        deliveryId,
        `No adapter for channel ${delivery.channel}`,
        currentAttempts,
        maxAttempts,
      );
      await rollUpNotificationStatus(delivery.notificationId);
      return;
    }

    try {
      const result = await adapter.send({
        notificationId: delivery.notificationId,
        userId: delivery.notification.userId,
        title: delivery.notification.title,
        body: delivery.notification.body,
        data: delivery.notification.data ?? undefined,
      });

      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.providerMessageId ?? null,
          lastError: null,
        },
      });

      logger.info("Delivery sent", {
        deliveryId,
        channel: delivery.channel,
        providerMessageId: result.providerMessageId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Delivery send failed", {
        deliveryId,
        channel: delivery.channel,
        error: message,
      });
      await handleFailure(deliveryId, message, currentAttempts, maxAttempts);
    }

    await rollUpNotificationStatus(delivery.notificationId);
  };
}
/**
 * attempts < maxAttempts → FAILED then back to QUEUED + delayed re-enqueue
 * else → DEAD
 */
async function handleFailure(
  deliveryId: string,
  lastError: string,
  attempts: number,
  maxAttempts: number,
) {
  if (attempts < maxAttempts) {
    const delayMs = calculateBackoffMs(attempts);
    // Mark FAILED (visible), then QUEUED so the delayed job can CAS
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", lastError },
    });
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: "QUEUED" },
    });
    await enqueueDelivery(deliveryId, delayMs, attempts + 1);
    logger.info("Delivery scheduled for retry", {
      deliveryId,
      attempts,
      maxAttempts,
      delayMs,
    });
  } else {
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: "DEAD", lastError },
    });

    logger.warn("Delivery moved to DEAD", {
      deliveryId,
      attempts,
      maxAttempts,
      lastError,
    });
  }
}

async function rollUpNotificationStatus(notificationId: string) {
  const deliveries = await prisma.delivery.findMany({
    where: { notificationId },
  });

  if (deliveries.length === 0) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
    return;
  }

  const allSent = deliveries.every((d) => d.status === "SENT");
  const allFailed = deliveries.every(
    (d) => d.status === "FAILED" || d.status === "DEAD",
  );
  const anySent = deliveries.some((d) => d.status === "SENT");
  const anyPending = deliveries.some(
    (d) => d.status === "QUEUED" || d.status === "SENDING",
  );

  let status: NotificationStatus;
  if (anyPending) status = "PENDING";
  else if (allSent) status = "DELIVERED";
  else if (allFailed) status = "FAILED";
  else if (anySent) status = "PARTIAL";
  else status = "FAILED";

  await prisma.notification.update({
    where: { id: notificationId },
    data: { status },
  });

  logger.info("Notification status rolled up", {
    notificationId,
    status,
  });
}
