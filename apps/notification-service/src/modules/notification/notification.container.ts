import type { DeliveryChannel } from "@notification/database";
import { NotificationRepository } from "./notification.repository.js";
import { NotificationService } from "./notification.service.js";
import { ChannelAdapter } from "./adapters/channel-adapter.interface.js";
import { InAppAdapter } from "./adapters/in-app.adapter.js";
import { EmailAdapter } from "./adapters/email.adapter.js";

const notificationRepository = new NotificationRepository();
const adapters = new Map<DeliveryChannel, ChannelAdapter>([
  ["IN_APP", new InAppAdapter()],
  ["EMAIL", new EmailAdapter()],
]);
export const notificationService = new NotificationService(
  notificationRepository,
  adapters,
);
