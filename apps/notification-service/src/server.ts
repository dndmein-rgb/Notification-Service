import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./config/logger.js";

async function main() {
  const app = createApp();

  app.listen(config.PORT, () => {
    logger.info(`🚀 notification-service listening on port ${config.PORT}`);
  });
}

main().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});