import IORedis from "ioredis";
import { config } from "../config";
import { ConnectionOptions, Queue } from "bullmq";

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
