import { Worker } from "bullmq";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { prisma } from "./infrastructure/prisma.js";
import {
  createRedisConnection,
  DELIVERY_QUEUE_NAME,
  type ProcessDeliveryJob,
} from "./infrastructure/queue.js";
import { createDeliveryProcessor } from "./processors/delivery.processor.js";
import { InAppAdapter } from "./adapters/in-app.adapter.js";
import { EmailAdapter } from "./adapters/email.adapter.js";
import type { DeliveryChannel } from "@notification/database";
import type { ChannelAdapter } from "./adapters/channel-adapter.interface.js";

async function main() {
  const connection = createRedisConnection();

  const adapters = new Map<DeliveryChannel, ChannelAdapter>([
    ["IN_APP", new InAppAdapter()],
    ["EMAIL", new EmailAdapter()],
  ]);

  const processor = createDeliveryProcessor(adapters);

  const worker = new Worker<ProcessDeliveryJob>(
    DELIVERY_QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    logger.info("Job completed", { jobId: job.id, deliveryId: job.data.deliveryId });
  });

  worker.on("failed", (job, err) => {
    logger.error("Job failed", {
      jobId: job?.id,
      deliveryId: job?.data.deliveryId,
      error: err.message,
    });
  });

  logger.info(`notification-worker started (queue=${DELIVERY_QUEUE_NAME})`);

  const shutdown = async (signal: string) => {
    logger.info(`Shutting down worker (${signal})`);
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(err, "Failed to start worker");
  process.exit(1);
});