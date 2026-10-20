import { DeliveryStatus, Delivery } from "@notification/database";
import { AdminInterface } from "./admin.interface";
import { prisma } from "../../infrastructure/prisma.js";

export class AdminRepository implements AdminInterface {
  async listDeliveries(params: {
    status?: DeliveryStatus;
    channel?: string;
    tenantId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: Delivery[]; total: number }> {
    const { limit, status, channel, page ,tenantId} = params;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (tenantId) {
        where.notification = { tenantId };
      }
    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          notification: {
            select: {
              id: true,
              userId: true,
              title: true,
              type: true,
              status: true,
              tenantId:true
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);
    return { data, total };
  }
  async findDeliverybyId(id: string): Promise<Delivery | null> {
    return prisma.delivery.findUnique({
      where: { id },
      include: {
        notification: {
          select: {
            id: true,
            userId: true,
            title: true,
            type: true,
            status:true
          }
        }
      }
    })
  }
  async resetDeliveryForRetry(id: string): Promise<Delivery> {
    return prisma.delivery.update({
      where: { id },
      data: {
        lastError:null
        ,status:"QUEUED"
      }
    })
  }
  async getStats(): Promise<{
      deliveriesByStatus: Record<string, number>;
      notificationsByStatus: Record<string, number>;
    }> {
      const [deliveryGroups, notificationGroups] = await Promise.all([
        prisma.delivery.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.notification.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);
  
      const deliveriesByStatus: Record<string, number> = {
        QUEUED: 0,
        SENDING: 0,
        SENT: 0,
        FAILED: 0,
        DEAD: 0,
      };
      for (const g of deliveryGroups) {
        deliveriesByStatus[g.status] = g._count._all;
      }
  
      const notificationsByStatus: Record<string, number> = {
        PENDING: 0,
        DELIVERED: 0,
        PARTIAL: 0,
        FAILED: 0,
      };
      for (const g of notificationGroups) {
        notificationsByStatus[g.status] = g._count._all;
      }
  
      return { deliveriesByStatus, notificationsByStatus };
    }
}
