import { NotificationRepository } from "./notification.repository.js";
import { NotificationService } from "./notification.service.js";


const notificationRepository = new NotificationRepository();
export const notificationService = new NotificationService(
  notificationRepository,
);
