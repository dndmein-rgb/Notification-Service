export * from "./errors.js"
export { asyncHandler } from "./asyncHandler.js";


export function generateId(prefix = ""): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id}` : id;
}

export function calculateBackoffMs(attempt: number, baseMs = 1000, maxMs = 60_000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  // full jitter
  return Math.floor(Math.random() * exp);
}