import { Delivery, Notification, type NotificationStatus } from "@notification/database";
import { CreateNotificationWriteData, NotificationWithDeliveries,UpdateDeliveryData } from "./notification.types";

export interface NotificationInterface{
  create(data: CreateNotificationWriteData): Promise<NotificationWithDeliveries>
   findByUserId(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
   }): Promise<{ data: Notification[]; total: number }>
  
  findById(id: string): Promise<Notification | null>
  
  /** Includes deliveries – useful for debugging / roll-up */
  findByIdWithDeliveries(id: string): Promise<NotificationWithDeliveries | null>;
  
  markAsRead(id: string): Promise<Notification>
  updateDelivery(deliveryId: string, data: UpdateDeliveryData): Promise<Delivery>
  
  getDeliveriesByNotificationId(notificationId: string): Promise<Delivery[]>
  
  updateNotificationStatus(id:string,status:NotificationStatus):Promise<Notification>
  
}
