import { Notification } from "@notification/database";
import { NotificationInterface } from "./notification.interface.js";
import { CreateNotificationWriteData } from "./notification.types.js";
import { prisma } from "../../infrastructure/prisma.js";

export class NotificationRepository implements NotificationInterface {
  async create(data: CreateNotificationWriteData): Promise<Notification> {
    return prisma.notification.create({
      data
    });
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
  async markAsRead(id: string): Promise<Notification > {
    return prisma.notification.update({
      where: { id },
      data:{readAt:new Date()}
    })
  }
}
  