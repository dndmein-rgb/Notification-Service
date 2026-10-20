import type { DeliveryChannel } from "@notification/database";
import type {
  ChannelAdapter,
  SendPayload,
  SendResult,
} from "./channel-adapter.interface.js";
import { logger } from "../config/logger.js";

export class PushAdapter implements ChannelAdapter {
  readonly channel: DeliveryChannel = "PUSH";

  async send(payload: SendPayload): Promise<SendResult> {
    const providerMessageId = `push-stub-${Date.now()}-${payload.notificationId.slice(0, 8)}`;

    logger.info("PushAdapter: stub send", {
      notificationId: payload.notificationId,
      userId: payload.userId,
      title: payload.title,
      providerMessageId,
    });

    return { providerMessageId };
  }
}