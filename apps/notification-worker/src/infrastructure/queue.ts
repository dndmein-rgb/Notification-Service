import IORedis from "ioredis";
import { config } from "../config";
import { ConnectionOptions, Queue } from "bullmq";
import { logger } from "../config/logger";

export const DELIVERY_QUEUE_NAME = "notification-deliveries"
export const DELIVERY_JOB_NAME = "process-delivery"

export type ProcessDeliveryJob = {
  deliveryId: string;
};

export function createRedisConnection(): IORedis{
  return new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest:null
  })
}

export function createDeliveryQueue(connection: ConnectionOptions) {
  return new Queue<ProcessDeliveryJob>(DELIVERY_QUEUE_NAME,{connection})
}

/**
 * Enqueue (or re-enqueue) a delivery job.
 * delayMs > 0 = backoff. jobId includes attempt so retries stay unique.
 */
export async function enqueueDelivery(deliveryId: string, delayMs = 0, attempt = 1):Promise<void> {
  const connection = createRedisConnection();
  const queue = createDeliveryQueue(connection);
  try {
    await queue.add(DELIVERY_JOB_NAME, {
      deliveryId
    }, {
      jobId: `deliveryId-${deliveryId}-attempt-${attempt}`,
      delay: delayMs > 0 ? delayMs : undefined,
      removeOnComplete: 1000,
      removeOnFail:5000
    })
    logger.debug("Enqueued delivery job", { deliveryId, delayMs, attempt });
  } finally {
    await queue.close();
        await connection.quit();
  }
}
