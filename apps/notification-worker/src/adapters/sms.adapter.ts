import type { DeliveryChannel } from "@notification/database";
import { ChannelAdapter, SendPayload, SendResult } from "./channel-adapter.interface";
import { logger } from "../config/logger";

export class SmsAdapter implements ChannelAdapter{
  readonly channel: DeliveryChannel = "SMS"
  async send(payload: SendPayload): Promise<SendResult>{
    const providerMessageId = `sms-stub-${Date.now()}-${payload.notificationId.slice(0, 8)}`;
    logger.info("SmsAdapter: stub send", {
          notificationId: payload.notificationId,
          userId: payload.userId,
          title: payload.title,
          providerMessageId,
        });
    
        return { providerMessageId };
  }
}