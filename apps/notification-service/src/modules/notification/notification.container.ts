import { NotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";

const notificationRepository=new NotificationRepository();
export const notificationService=new NotificationService(notificationRepository)