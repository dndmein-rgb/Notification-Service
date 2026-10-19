import type { DeliveryStatus } from "@notification/database";
import { AdminInterface } from "./admin.interface";
import { ConflictError, NotFoundError, ValidationError } from "@notification/shared-utils";
import { enqueueDelivery } from "../../infrastructure/queue";
import { logger } from "../../config/logger";

export class AdminService {
  constructor(private readonly repo: AdminInterface) { }

  async listDeliveries(params: {
    status?: DeliveryStatus;
    channel?: string;
    page: number;
    limit: number;
  }) {
    const { data, total } = await this.repo.listDeliveries(params);
    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit) || 0,
      },
    }
  }
  async retryDelivery(id: string) {
    if (!id) throw new ValidationError("Delivery id is required");
    const delivery = await this.repo.findDeliverybyId(id);
    if (!delivery) throw new NotFoundError("Delivery", id);

    if (delivery.status !== "DEAD" && delivery.status !== "FAILED") {
      throw new ConflictError(
              `Cannot retry delivery in status ${delivery.status}. Only DEAD or FAILED are allowed.`,
            );
    }
    const updated = await this.repo.resetDeliveryForRetry(id);
        await enqueueDelivery(id);
    
        logger.info("Admin forced retry of delivery", {
          deliveryId: id,
          previousStatus: delivery.status,
        });
    
        return updated;
      }
    
      async getStats() {
        return this.repo.getStats();
      }
}

