import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { prisma } from "./infrastructure/prisma.js";
import { deliveryQueue } from "./infrastructure/queue.js";

async function main() {
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`notification-service listening on port ${config.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Shutting down API (${signal})`);
    server.close(async () => {
      try {
        await deliveryQueue.close();
        await prisma.$disconnect();
        logger.info("API shutdown complete");
        process.exit(0);
      } catch (err) {
        logger.error(err, "Error during API shutdown");
        process.exit(1);
      }
    });
    // Force exit if drain takes too long
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});