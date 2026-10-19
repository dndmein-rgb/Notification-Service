import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

export const DELIVERY_QUEUE_NAME = "notification-deliveries";
export const DELIVERY_JOB_NAME = "process-delivery";

export type ProcessDeliveryJob = {
  deliveryId: string;
};

const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const deliveryQueue = new Queue<ProcessDeliveryJob>(
  DELIVERY_QUEUE_NAME,
  {
    connection,
  },
);

/**
 * Enqueue one delivery job (create path + admin retry).
 */
export async function enqueueDelivery(
  deliveryId: string,
  delayMs = 0,
): Promise<void> {
  const jobId = `delivery-${deliveryId}-${Date.now()}`;

  await deliveryQueue.add(
    DELIVERY_JOB_NAME,
    { deliveryId },
    {
      jobId,
      delay: delayMs > 0 ? delayMs : undefined,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
  logger.debug("Enqueued delivery job", { deliveryId, delayMs, jobId });
}
