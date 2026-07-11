import { pollingManager } from "../polling/polling-manager";
import type { PollTrigger } from "@/domain/schemas/flow";
import type { HubSpotConfig } from "./hubspot-poller";
import { pollHubSpot } from "./hubspot-poller";
import { pollHubSpotDeals } from "./hubspot-deals-poller";
import { pollHubSpotTickets } from "./hubspot-tickets-poller";
import { getConnection, resolveConnectionSecret } from "../connections";
import { loadLastSyncAt, saveLastSyncAt } from "./poll-sync-state";

export async function registerHubSpotPolling(trigger: PollTrigger): Promise<void> {
  const { connectionId, intervalMs } = trigger.config;
  const objectType = trigger.config.objectType ?? "contacts";

  // Resolver la conexión (proxyUrl en claro + token cifrado) en vez de
  // credenciales embebidas en el propio flow — ver spec 020 §D. Antes el
  // token se guardaba en texto plano dentro de `encryptedToken.ciphertext`
  // sin pasar nunca por el vault en el guardado, así que este `decrypt`
  // siempre lanzaba y el registro del polling quedaba silenciosamente
  // muerto; ahora la conexión sí se cifra al crearse (`connections.ts`).
  const connection = await getConnection(connectionId);
  if (!connection) {
    console.error(`[HubSpot Polling] Conexión "${connectionId}" no encontrada; no se registra el polling.`);
    return;
  }
  const proxyUrl = String(connection.config.proxyUrl ?? "");
  let accessToken: string | null;
  try {
    accessToken = await resolveConnectionSecret(connectionId);
  } catch (error) {
    console.error(`[HubSpot Polling] No se pudo desencriptar el token de "${connectionId}":`, error);
    return;
  }
  if (!proxyUrl || !accessToken) {
    console.error(`[HubSpot Polling] Conexión "${connectionId}" sin proxyUrl o token; no se registra el polling.`);
    return;
  }

  const config: HubSpotConfig = {
    proxyUrl,
    credentials: { accessToken },
    pollingIntervalMs: intervalMs,
    objectTypes: [objectType],
    // Antes se perdían aquí — el poller nunca recibía lo que el usuario
    // configuró en "Filtros"/"Campos a traer" (spec 021 §2).
    fields: trigger.config.fields,
    filters: trigger.config.filters,
  };

  const key = objectType === "contacts" ? "hubspot" : `hubspot-${objectType}`;

  // Seleccionar el poller correcto según objectType
  const poller = objectType === "deals"
    ? pollHubSpotDeals
    : objectType === "tickets"
    ? pollHubSpotTickets
    : pollHubSpot;

  pollingManager.register(key, {
    intervalMs,
    backoffOnFailure: true,
    maxIntervalMs: 1800000, // 30 minutos
    enabled: true,
  }, async () => {
    const lastSyncAt = loadLastSyncAt(key);
    const result = await poller(config, lastSyncAt);

    if (result.success) {
      saveLastSyncAt(key, result.lastExternalTimestamp);

      // Aplicar los registros traídos contra los flows configurados con este
      // trigger (el flow define el mapeo y los outputs; el poller solo trae datos).
      if (result.records && result.records.length > 0) {
        try {
          const { useDataStore } = await import("@/store/useDataStore");
          await useDataStore.getState().runPolledFlow(key, result.records);
        } catch (error) {
          console.error("[HubSpot Polling] Error applying polled records to flows:", error);
        }
      }
    }

    return {
      success: result.success,
      newRecords: result.newRecords,
      lastExternalTimestamp: result.lastExternalTimestamp,
      error: result.error,
    };
  });
}

export function unregisterHubSpotPolling(objectType: string): void {
  const key = objectType === "contacts" ? "hubspot" : `hubspot-${objectType}`;
  pollingManager.unregister(key);
}
