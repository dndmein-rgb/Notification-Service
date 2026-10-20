import pg from "pg";
import IORedis from "ioredis";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

export type ReadyCheck = {
  name: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

export type ReadyResult = {
  ready: boolean;
  checks: ReadyCheck[];
};

async function checkPostgres(): Promise<ReadyCheck> {
  const start = Date.now();
  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 2_000,
  });
  try {
    await pool.query("SELECT 1");
    return { name: "postgres", ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name: "postgres",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function checkRedis(): Promise<ReadyCheck> {
  const start = Date.now();
  const redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    return {
      name: "redis",
      ok: pong === "PONG",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "redis",
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    redis.disconnect();
  }
}

/**
 * Optional Kafka check via TCP-ish approach: try listing metadata with kafkajs.
 * Keep optional so API can stay up if only Kafka is used by the worker.
 */
async function checkKafka(): Promise<ReadyCheck | null> {
  if (!config.KAFKA_BROKERS) return null;
  // Lazy import so service package.json doesn't require kafkajs unless you add it
  try {
    const { Kafka } = await import("kafkajs");
    const start = Date.now();
    const kafka = new Kafka({
      clientId: "notification-service-ready",
      brokers: config.KAFKA_BROKERS.split(",").map((b) => b.trim()),
      connectionTimeout: 2_000,
      requestTimeout: 2_000,
    });
    const admin = kafka.admin();
    try {
      await admin.connect();
      await admin.describeCluster();
      return { name: "kafka", ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        name: "kafka",
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
  } catch (err) {
    logger.debug("Kafka readiness skipped or failed to load kafkajs", { err });
    return {
      name: "kafka",
      ok: false,
      error: "kafkajs not available in service (optional)",
    };
  }
}

export async function getReadyStatus(opts?: {
  includeKafka?: boolean;
}): Promise<ReadyResult> {
  const checks: ReadyCheck[] = [];

  const [pgCheck, redisCheck] = await Promise.all([
    checkPostgres(),
    checkRedis(),
  ]);
  checks.push(pgCheck, redisCheck);

  if (opts?.includeKafka) {
    const kafkaCheck = await checkKafka();
    if (kafkaCheck) checks.push(kafkaCheck);
  }

  // Required: postgres + redis. Kafka optional for API readiness.
  const requiredOk = checks
    .filter((c) => c.name === "postgres" || c.name === "redis")
    .every((c) => c.ok);

  return { ready: requiredOk, checks };
}