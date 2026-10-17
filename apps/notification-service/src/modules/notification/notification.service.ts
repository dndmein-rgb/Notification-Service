import { NotFoundError, ValidationError } from "@notification/shared-utils";
import { NotificationInterface } from "./notification.interface.js";
import { CreateNotificationInput } from "./notification.schema";

export class NotificationService {
  constructor(private readonly repo: NotificationInterface) {}

  async create(input: CreateNotificationInput) {
    return this.repo.create({
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? undefined,
      status: "DELIVERED",
    });
  }

  async getUserNotifications(params: {
    userId: string;
    tenantId?: string;
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }) {
    const { userId, tenantId, page, limit, unreadOnly } = params;

    if (!userId) {
      throw new ValidationError("userId is required");
    }

    const { data, total } = await this.repo.findByUserId({
      userId,
      tenantId,
      page,
      limit,
      unreadOnly,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findNotificationById(id: string) {
    if (!id) {
      throw new NotFoundError("NotificationId not found");
    }
    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }
    return notification;
  }
  async markAsRead(id: string) {
    if (!id) {
      throw new ValidationError("Notification id is required");
    }
    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }
    // Idempotent: already read → just return it
    if (notification.readAt) {
      return notification;
    }
    return await this.repo.markAsRead(id);
  }
}
