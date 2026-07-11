import { unwrapProxyEnvelope } from "./inbound/proxy-envelope";

interface RawEnvelope {
  status?: number;
  data?: unknown;
  error?: string;
}

export type ProxyFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "cors" | "timeout" | "http" | "remote-error" | "network"; message: string };

/**
 * POST a un proxy de Apps Script del usuario (HubSpot o Google Sheets — ver
 * `AppsScriptGuide.tsx`). Único punto de entrada para estas llamadas; existe
 * para que dos bugs reales encontrados en spec 021 no puedan volver a
 * reintroducirse en un poller nuevo:
 *
 * 1. **CORS**: un POST con `Content-Type: application/json` es una petición
 *    "no simple" y dispara un preflight `OPTIONS`, que los Apps Script Web
 *    Apps no pueden responder — el navegador bloquea la petición real antes
 *    de enviarla. Por eso aquí SIEMPRE se manda `text/plain`. Apps Script lee
 *    el body crudo vía `e.postData.contents` sin importar el Content-Type
 *    declarado, así que esto no requiere tocar el script del usuario.
 * 2. **Estado real enterrado en el body**: los Web Apps de Apps Script
 *    devuelven siempre HTTP 200 a nivel de transporte — el código de error
 *    real (de HubSpot, de Sheets, o del propio script) vive dentro del
 *    envelope `{status, data}`. `response.ok` nunca lo detecta; aquí sí.
 */
export async function postToProxy<T>(
  url: string,
  payload: Record<string, unknown>,
  timeoutMs = 15_000
): Promise<ProxyFetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        kind: "timeout",
        message: `Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s).`,
      };
    }
    if (error instanceof TypeError) {
      // "Failed to fetch" (Chrome) / "NetworkError when attempting to
      // fetch resource" (Firefox) — el navegador nunca llegó a completar la
      // petición. Con un proxy de Apps Script la causa más común es un
      // despliegue con acceso mal configurado (no "Cualquier persona") o
      // una URL incorrecta/borrada.
      return {
        ok: false,
        kind: "cors",
        message:
          'No se pudo conectar con el proxy (posible bloqueo de CORS o URL incorrecta). Revisa que el despliegue tenga acceso "Cualquier persona" — ver la guía de configuración.',
      };
    }
    return { ok: false, kind: "network", message: error instanceof Error ? error.message : String(error) };
  }

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : "";
    return { ok: false, kind: "http", message: `El proxy respondió HTTP ${response.status}${statusText}.` };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, kind: "http", message: "El proxy no devolvió JSON válido." };
  }

  const envelope = json as RawEnvelope;
  if (typeof envelope?.status === "number" && envelope.status >= 400) {
    const remoteData = envelope.data as { error?: string; message?: string } | undefined;
    return {
      ok: false,
      kind: "remote-error",
      message: remoteData?.error || remoteData?.message || envelope.error || `Error ${envelope.status}.`,
    };
  }

  return { ok: true, data: unwrapProxyEnvelope<T>(json) };
}
