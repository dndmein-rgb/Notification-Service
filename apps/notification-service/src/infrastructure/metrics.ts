import client  from "prom-client"
const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix:"notification_service_"
})

export const notificationsCreatedTotal = new client.Counter({
  name: "notifications_created_total",
  help: "Total notifications created (excludes pure idempotent replays)",
  labelNames: ["tenant_id"] as const,
  registers: [register],
})

export const deliveriesSentTotal = new client.Counter({
  name: "delivery_sent_total",
  help: "Deliveries marked SENT (incremented when API observes admin/stats paths optional; primary in worker)",
  labelNames: ["channel"] as const,
  registers: [register],
});

export const deliveriesDeadTotal = new client.Counter({
  name: "delivery_dead_total",
  help: "Deliveries moved to DEAD",
  labelNames: ["channel"] as const,
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
})

export async function metricsText(): Promise<string> {
  return register.metrics();
}

export { register };