import type { NotificationStatus, Prisma } from "@notification/database";

export type CreateNotificationWriteData = {
  userId: string;
  tenantId?: string | null;
  title: string;
  type: string;
  body: string;
  data?: Prisma.InputJsonValue;
  status:NotificationStatus
}