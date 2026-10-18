import type { DeliveryChannel } from "@notification/database";

export type SendPayload = {
  notificationId: string;
  userId: string;
  data?: unknown;
  body: string;
  toEmail?: string;
  title:string
}

export type SendResult = {
  providerMessageId?:string
}
export interface ChannelAdapter{
  readonly channel:DeliveryChannel
   send(payload:SendPayload):Promise<SendResult>
 }