import type { Job } from "bullmq";
import type { DeliveryChannel, NotificationStatus } from "@notification/database";
import { prisma } from "../infrastructure/prisma.js";
import type { ProcessDeliveryJob } from "../infrastructure/queue.js";
import type { ChannelAdapter } from "../adapters/channel-adapter.interface.js";
import { logger } from "../config/logger.js";

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

    const adapter = adapters.get(delivery.channel);
    if (!adapter) {
      await markFailed(deliveryId, `No adapter for channel ${delivery.channel}`);
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
      await markFailed(deliveryId, message);
    }

    await rollUpNotificationStatus(delivery.notificationId);
  };
}

async function markFailed(deliveryId: string, lastError: string) {
  await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status: "FAILED",
      lastError,
    },
  });
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