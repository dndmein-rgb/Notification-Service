import type { DeliveryChannel } from "@notification/database";

export type PreferenceRow={
  id: string;
  userId: string;
  channel: DeliveryChannel;
  enabled: boolean;
  createdAt: Date;
  updatedAt:Date
}
export interface PreferenceInterface{
  findByUserId(userId: string): Promise<PreferenceRow[]>
  upsertMany(userId:string,items:Array<{channel:DeliveryChannel,enabled:boolean}>):Promise<PreferenceRow[]>
  getEnabledMap(userId:string):Promise<Map<DeliveryChannel,boolean>>
}