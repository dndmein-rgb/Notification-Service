import IORedis from "ioredis";
import { config } from "../config";
import rateLimit, {
  ValueDeterminingMiddleware,
  Options,
} from "express-rate-limit";
import RedisStore, { RedisReply } from "rate-limit-redis";
import { RequestHandler } from "express";
const rateLimitRedis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
});

interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  prefix: string;
  error: { message: string; code: string };
  keyGenerator?: Options["keyGenerator"];
}

export const createRateLimiter = ({
  windowMs,
  limit,
  prefix,
  error,
  keyGenerator,
}: RateLimiterOptions): RequestHandler => {
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Fail open if Redis is unavailable.
    passOnStoreError: true,
    validate: {
      keyGeneratorIpFallback: false,
    },
    store: new RedisStore({
      sendCommand: async (...args: string[]) => {
        const [command, ...commandArgs] = args;
        if (!command) {
          throw new Error("Redis command is required");
        }
        return rateLimitRedis.call(
          command,
          ...commandArgs,
        ) as Promise<RedisReply>;
      },
      prefix: `rate-limit:${prefix}:`,
    }),

    ...(keyGenerator ? { keyGenerator } : {}),

    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    },
  };

  return rateLimit(options);
};

export const createNotificationLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: 60,
  error: {
    code: "RATE_LIMITED",
    message: "Too many notification create requests, try again later",
  },
  prefix: "notification-create",
  keyGenerator: (req) => {
      const apiKey = req.header("X-API-Key") ?? req.header("x-api-key");
      if (apiKey) return `key:${apiKey}`;
      return `ip:${req.ip ?? "unknown"}`;
    },
});
