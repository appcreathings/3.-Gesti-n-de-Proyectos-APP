import { integrationDb } from "@/storage/integration-db";

const processedEvents = new Set<string>();
const MAX_IDEMPOTENCY_CACHE = 1_000;

export async function idempotencyCheck(eventId: string): Promise<boolean> {
  if (processedEvents.has(eventId)) return true;

  const existing = await integrationDb.syncLogs
    .where("id")
    .equals(eventId)
    .first();

  if (existing) return true;

  processedEvents.add(eventId);
  if (processedEvents.size > MAX_IDEMPOTENCY_CACHE) {
    const first = processedEvents.values().next().value;
    if (first) processedEvents.delete(first);
  }

  return false;
}

export function clearIdempotencyCache(): void {
  processedEvents.clear();
}
