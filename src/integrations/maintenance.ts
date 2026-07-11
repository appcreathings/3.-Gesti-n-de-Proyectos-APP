import { integrationDb } from "@/storage/integration-db";

const SYNC_LOG_RETENTION_DAYS = 30;
const MAX_SYNC_LOGS = 5_000;
const MAX_QUEUE_AGE_DAYS = 7;

let maintenanceRun = false;

export async function runMaintenance(): Promise<void> {
  const logCutoff = new Date();
  logCutoff.setDate(logCutoff.getDate() - SYNC_LOG_RETENTION_DAYS);

  await integrationDb.syncLogs
    .where("createdAt")
    .below(logCutoff.toISOString())
    .delete();

  const totalLogs = await integrationDb.syncLogs.count();
  if (totalLogs > MAX_SYNC_LOGS) {
    const allLogs = await integrationDb.syncLogs
      .orderBy("createdAt")
      .reverse()
      .offset(MAX_SYNC_LOGS)
      .toArray();

    for (const log of allLogs) {
      await integrationDb.syncLogs.delete(log.id);
    }
  }

  const queueCutoff = new Date();
  queueCutoff.setDate(queueCutoff.getDate() - MAX_QUEUE_AGE_DAYS);

  const deadDeliveries = await integrationDb.outboundQueue
    .where("nextRetryAt")
    .below(queueCutoff.toISOString())
    .filter((d: { attemptCount: number }) => d.attemptCount >= 5)
    .toArray();

  for (const delivery of deadDeliveries) {
    await integrationDb.outboundQueue.delete(delivery.id);
  }
}

export function maybeRunMaintenance(): void {
  if (!maintenanceRun) {
    maintenanceRun = true;
    void runMaintenance();
  }
}
