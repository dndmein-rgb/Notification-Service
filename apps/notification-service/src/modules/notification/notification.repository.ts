import { Delivery, Notification, NotificationStatus } from "@notification/database";
import { NotificationInterface } from "./notification.interface.js";
import { CreateNotificationWriteData, NotificationWithDeliveries, UpdateDeliveryData } from "./notification.types.js";
import { prisma } from "../../infrastructure/prisma.js";

export class NotificationRepository implements NotificationInterface {
  async create(data: CreateNotificationWriteData): Promise<NotificationWithDeliveries> {
    const { channels, status, ...notificationData } = data
    return prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          ...notificationData,
          status: status ?? "PENDING",
          deliveries: {
            create: channels.map((channel) => ({
              channel,
              status: "QUEUED",
              maxAttempts:3
            }))
          }
        },
        include:{deliveries:true}
        
      })
      return notification;
    })
  }

  async findByUserId(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<{ data: Notification[]; total: number }> {
    const { userId, tenantId, page, limit, unreadOnly } = params;

    const where: any = {
      userId,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total };
  }



    async findById(id:string):Promise<Notification|null>{
    return prisma.notification.findUnique({
      where:{id}
    })
    }

  async findByIdWithDeliveries(id: string): Promise<NotificationWithDeliveries | null> {
    return prisma.notification.findUnique({
      where: { id },
      include:{deliveries:true}
    })
  }
  async markAsRead(id: string): Promise<Notification > {
    return prisma.notification.update({
      where: { id },
      data:{readAt:new Date()}
    })
  }
  async updateDelivery(deliveryId: string, data: UpdateDeliveryData): Promise<Delivery> {
    return prisma.delivery.update({
      where: { id: deliveryId },
      data
    })
  }
  async updateNotificationStatus(id: string, status: NotificationStatus): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data:{status}
    })
  }
  async getDeliveriesByNotificationId(notificationId: string): Promise<Delivery[]> {
    return prisma.delivery.findMany({
      where: { notificationId },
      orderBy: { createdAt: "asc" },
    })
  }
}
  