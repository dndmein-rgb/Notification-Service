import { z } from "zod"

export const PreferenceItemSchema = z.object({
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
  enabled:z.boolean()
})

export const UpdatePreferencesBodySchema = z.object({
  preferences:z.array(PreferenceItemSchema).min(1)
})

export type UpdatePreferencesBody = z.infer<typeof UpdatePreferencesBodySchema>;

export const UserIdParamsSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

export type UserIdParams = z.infer<typeof UserIdParamsSchema>;