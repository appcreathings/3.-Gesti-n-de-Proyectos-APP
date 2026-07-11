/**
 * Envelope unificado que usan los dos proxies de Apps Script (HubSpot y
 * Google Sheets, ver `AppsScriptGuide.tsx`): `{ status, data }`. Antes cada
 * poller de HubSpot lo interpretaba distinto — `hubspot-poller.ts` (contacts)
 * desenvolvía `data.data ?? data`, pero `hubspot-deals-poller.ts` y
 * `hubspot-tickets-poller.ts` leían `data.results` directo, que con el
 * `Code.gs` real de la guía (que SIEMPRE envuelve en `{status,data}`) nunca
 * tenía `results` — los deals/tickets llegaban vacíos en silencio. Esta
 * función es la única fuente de verdad para desenvolver, usada por los 4
 * pollers y por `testConnection`.
 *
 * Tolera también un proxy que no envuelva (devuelve el body tal cual) — no
 * penaliza a un usuario que adaptó el script y quitó el envelope.
 */
export function unwrapProxyEnvelope<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}
