import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "notification_worker_",
});

export const deliveriesSentTotal = new client.Counter({
  name: "delivery_sent_total",
  help: "Deliveries successfully sent",
  labelNames: ["channel"] as const,
  registers: [register],
});

export const deliveriesDeadTotal = new client.Counter({
  name: "delivery_dead_total",
  help: "Deliveries moved to DEAD",
  labelNames: ["channel"] as const,
  registers: [register],
});

export const deliveriesFailedTotal = new client.Counter({
  name: "delivery_failed_total",
  help: "Delivery send failures (includes retries)",
  labelNames: ["channel"] as const,
  registers: [register],
});

export const sendLatencySeconds = new client.Histogram({
  name: "delivery_send_latency_seconds",
  help: "Time spent in channel adapter send()",
  labelNames: ["channel"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const outboxPublishedTotal = new client.Counter({
  name: "outbox_published_total",
  help: "Outbox rows successfully published to Kafka",
  registers: [register],
});

export const outboxPublishErrorsTotal = new client.Counter({
  name: "outbox_publish_errors_total",
  help: "Outbox publish failures",
  registers: [register],
});

export async function metricsText(): Promise<string> {
  return register.metrics();
}

export { register };