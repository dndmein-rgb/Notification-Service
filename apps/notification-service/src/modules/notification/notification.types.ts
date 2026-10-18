import type {
  DeliveryChannel,
  DeliveryStatus,
  NotificationStatus,
  Prisma,
} from "@notification/database";

export type CreateNotificationWriteData = {
  userId: string;
  tenantId?: string | null;
  title: string;
  type: string;
  body: string;
  data?: Prisma.InputJsonValue;
  status?: NotificationStatus;
  channels: DeliveryChannel[];
};
export type CreateDeliveryWriteData = {
  notificationId: string;
  channel: DeliveryChannel;
  status?: DeliveryStatus;
  maxAttempts: number;
};

export type UpdateDeliveryData = {
  status?: DeliveryStatus;
  attempts?: number;
  lastError?: string | null;
  providerMessageId?: string | null;
  sentAt?: Date | null;
};

export type NotificationWithDeliveries = Prisma.NotificationGetPayload<{
  include: { deliveries: true };
}>;
