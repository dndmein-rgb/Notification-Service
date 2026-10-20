import type { Delivery, DeliveryStatus } from "@notification/database";

export interface AdminInterface {
  listDeliveries(params: {
    status?: DeliveryStatus,
    channel?: string;
    tenantId?:string
    page: number;
    limit: number
  }): Promise<{ data: Delivery[], total: number }>
  findDeliverybyId(id: string): Promise<Delivery | null>
   resetDeliveryForRetry(id: string): Promise<Delivery>
    getStats(): Promise<{
       deliveriesByStatus: Record<string, number>;
       notificationsByStatus: Record<string, number>;
     }>
}