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

export const deliveryQueue = new Queue<ProcessDeliveryJob>(DELIVERY_QUEUE_NAME, {
  connection,
});

/**
 * Enqueue one delivery job.
 * Call this AFTER the DB transaction that created the Delivery row has committed.
 */

export async function enqueueDelivery(deliveryId: string): Promise<void>{
  await deliveryQueue.add(DELIVERY_JOB_NAME, { deliveryId }, {
    jobId: `delivery-${deliveryId}`,// idempotent: same deliveryId → same job
    removeOnComplete: 1000,
    removeOnFail:5000
  })
  logger.debug("Enqueued delivery job", { deliveryId });
}
