import "dotenv/config"
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  KAFKA_BROKERS: z.string(),
  ADMIN_API_KEY: z.string().min(8),
  CLIENT_ORIGINS: z
          .string()
          .min(1)
          .transform((value) => value.split(",").map((origin) => origin.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  SERVICE_NAME: "notification-service",
} as const;