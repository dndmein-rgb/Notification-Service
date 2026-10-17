import { Notification } from "@notification/database";
import { CreateNotificationWriteData } from "./notification.types";

export interface NotificationInterface{
  create(data: CreateNotificationWriteData): Promise<Notification>
   findByUserId(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<{ data: Notification[]; total: number }>
  findById(id: string): Promise<Notification | null>
  markAsRead(id:string):Promise<Notification>
}
