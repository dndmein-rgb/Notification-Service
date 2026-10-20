// infrastructure/outbox-publisher.ts (conceptual)
import { Kafka } from "kafkajs";
import { prisma } from "./prisma.js";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

const TOPIC = "notification.events";
const BATCH_SIZE = 50;
const POLL_MS = 1000;

const kafka = new Kafka({
  clientId: "notification-outbox-publisher",
  brokers: [config.KAFKA_BROKERS],
});

const producer = kafka.producer({ idempotent: true });

export async function startOutboxPublisher() {
  await producer.connect();

  const tick = async () => {
    try {
      // Fetch unpublished
      const rows = await prisma.outbox.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
      });

      if (rows.length === 0) return;

      for (const row of rows) {
        try {
          await producer.send({
            topic: TOPIC,
            messages: [
              {
                key: row.aggregateId,           // ordering per aggregate
                value: JSON.stringify({
                  eventId: row.eventId,
                  eventType: row.eventType,
                  aggregateType: row.aggregateType,
                  aggregateId: row.aggregateId,
                  payload: row.payload,
                  occurredAt: row.createdAt.toISOString(),
                }),
                headers: {
                  "event-id": row.eventId,
                  "event-type": row.eventType,
                },
              },
            ],
          });

          // Mark published only after Kafka ack
          await prisma.outbox.update({
            where: { id: row.id },
            data: {
              publishedAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await prisma.outbox.update({
            where: { id: row.id },
            data: {
              attempts: { increment: 1 },
              lastError: message,
            },
          });
          logger.error("Outbox publish failed", { outboxId: row.id, error: message });
        }
      }
    } catch (err) {
      logger.error(err, "Outbox publisher tick failed");
    }
  };

  setInterval(() => void tick(), POLL_MS);
  logger.info("Outbox publisher started");
}