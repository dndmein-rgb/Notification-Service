import { z } from "zod"

export const ListDeliveriesQuerySchema = z.object({
  status:z.enum(["QUEUED", "SENDING", "SENT", "FAILED", "DEAD"])
      .optional()
      .default("DEAD"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]).optional(),
    tenantId: z.string().min(1).optional(),
})
export type ListDeliveriesQuery = z.infer<typeof ListDeliveriesQuerySchema>;

export const DeliveryIdParamsSchema = z.object({
  id: z.uuid("Invalid delivery id"),
});

export type DeliveryIdParams = z.infer<typeof DeliveryIdParamsSchema>;