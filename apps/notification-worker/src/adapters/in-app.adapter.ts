import { DeliveryChannel } from "@notification/database";
import { ChannelAdapter, SendPayload, SendResult } from "./channel-adapter.interface.js";
import { logger } from "../../../config/logger";

export class InAppAdapter implements ChannelAdapter{
  readonly channel: DeliveryChannel = "IN_APP";
  async send(payload: SendPayload): Promise<SendResult> {
    // In-app is just a record in the DB. Nothing to push externally in Phase 2.
        logger.debug("InAppAdapter: delivery recorded", {
          notificationId: payload.notificationId,
          userId: payload.userId,
        });
        return {}; // no providerMessageId
  }
}