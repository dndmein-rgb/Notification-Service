import type{ DeliveryChannel } from "@notification/database";
import { prisma } from "../../infrastructure/prisma.js";
import { PreferenceInterface, PreferenceRow } from "./preference.interface.js";

export class PreferenceRepository implements PreferenceInterface{
  async findByUserId(userId: string): Promise<PreferenceRow[]> {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { channel: "asc" },
    })
  }
  async upsertMany(userId: string, items: Array<{ channel: DeliveryChannel; enabled: boolean; }>): Promise<PreferenceRow[]> {
    await prisma.$transaction(items.map((item) => prisma.notificationPreference.upsert({
      where: {
        userId_channel:{userId,channel:item.channel}
      },
      create: {
        userId,
        channel: item.channel,
                    enabled: item.enabled,
      },
      update: {
        enabled: item.enabled,
      }
    })))
    return this.findByUserId(userId)
  }
  /**
     * Returns a map channel → enabled.
     * Missing channel means enabled (opt-out default).
     */
  async getEnabledMap(userId: string): Promise<Map<DeliveryChannel, boolean>> {
    const rows = await this.findByUserId(userId);
    const map = new Map<DeliveryChannel, boolean>();
    for (const row of rows) {
      map.set(row.channel,row.enabled)
    }
    return map;
  }
}