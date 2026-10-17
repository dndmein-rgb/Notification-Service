import { NotificationStatus } from "@notification/shared-types";
import { z } from "zod"

export const CreateNotificationBodySchema = z.object({
  userId: z.string().min(1,"UserId is required"),
  tenantId: z.string().optional(),
  type: z.string().min(1).max(200),
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  data: z.record(z.string(), z.json()).optional(),
})

export type CreateNotificationInput=z.infer<typeof CreateNotificationBodySchema>

export const GetUserNotificationsQuerySchema = z.object({
  userId: z.string().min(1, "userId is required"),
  tenantId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type GetUserNotificationsQuery = z.infer<typeof GetUserNotificationsQuerySchema>;