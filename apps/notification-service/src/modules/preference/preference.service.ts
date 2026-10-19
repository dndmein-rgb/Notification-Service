import type { DeliveryChannel } from "@notification/database";
import { PreferenceRepository } from "./preference.repository.js";
import { ValidationError } from "@notification/shared-utils";

const ALL_CHANNELS: DeliveryChannel[] = ["EMAIL", "IN_APP", "PUSH", "SMS"]

export class PreferenceService{
  constructor(private readonly repo: PreferenceRepository) { }
  /**
     * Effective preferences: missing row = enabled (opt-out).
     */
  async getEffective(userId: string) {
    if (!userId) throw new ValidationError("userId is required");
    
        const rows = await this.repo.findByUserId(userId);
        const byChannel = new Map(rows.map((r) => [r.channel, r.enabled]));
    
        const preferences = ALL_CHANNELS.map((channel) => ({
          channel,
          enabled: byChannel.get(channel) ?? true, // opt-out default
        }));
    
    return { userId, preferences };
  }
  async update(userId: string, items: Array<{ channel: DeliveryChannel; enabled: boolean }>) {
    if (!userId) throw new ValidationError("userId is required");
        if (!items.length) throw new ValidationError("preferences array is required");
    
        await this.repo.upsertMany(userId, items);
        return this.getEffective(userId);
  }
  /**
     * Resolve which channels should actually get a Delivery row.
     * - Missing preference = enabled
     * - IN_APP is always kept (product policy)
     */
    async resolveChannels(
      userId: string,
      requested: DeliveryChannel[],
    ): Promise<DeliveryChannel[]> {
      const enabledMap = await this.repo.getEnabledMap(userId);
  
      const filtered = requested.filter((ch) => {
        // IN_APP always on
        if (ch === "IN_APP") return true;
        return enabledMap.get(ch) !== false;
      });
  
      // Guarantee IN_APP is present even if caller forgot it
      if (!filtered.includes("IN_APP")) {
        filtered.unshift("IN_APP");
      }
  
      return filtered;
    }
}