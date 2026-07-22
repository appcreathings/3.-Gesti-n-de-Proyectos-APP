import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2, XCircle, Clock, Send, RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { SyncLog } from "@/storage/integration-db";
import { integrationDb } from "@/storage/integration-db";
import { useFlowStore } from "@/store/useFlowStore";
import type { WebhookOutput } from "@/domain/schemas/flow";
import { buildWebhookRequest } from "@/flows/webhook-request";
import { buildOutboundSyncLog } from "@/flows/delivery-log";
import type { OutboundDelivery } from "@/flows/engine";
import { uuid, nowIso } from "@/lib/utils";
import { ROUTES } from "@/routes/paths";

interface Props {
  log: SyncLog | null;
  onClose: () => void;
}

/** Resultado inline del reenvío (spec 033 A1). */
type ReplayResult =
  | { ok: true; httpStatus: number; snippet: string }
  | { ok: false; error: string };

export function DeliveryDetailDrawer({ log, onClose }: Props) {
  const navigate = useNavigate();
  const flows = useFlowStore((s) => s.flows);
  const [confirmReplay, setConfirmReplay] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);

  if (!log) return null;

  let requestPayload: unknown = null;
  try {
    requestPayload = JSON.parse(log.requestPayload);
  } catch {
    // ignore
  }

  // Spec 033 A1 — Reenviar: solo aplicable a entregas outbound de webhook
  // cuyo output sobrevive en el Flujo vivo (de ahí se recupera el `secret` de
  // firma, que nunca vive en el log). Si el Flujo fue borrado, o el output ya
  // no es un webhook, el botón se deshabilita con aviso.
  const canReplay =
    log.direction === "outbound" &&
    log.provider === "webhook" &&
    typeof log.flowId === "string" &&
    typeof log.outputIndex === "number";
  const liveFlow = canReplay ? flows.find((f) => f.id === log.flowId) : undefined;
  const liveOutput = liveFlow?.outputs[log.outputIndex ?? -1];
  const liveWebhook = liveOutput?.type === "webhook" ? (liveOutput as WebhookOutput) : undefined;
  const replayDisabledReason =
    !canReplay
      ? "Esta entrada no proviene de un output de webhook de un Flujo."
      : !liveFlow
        ? "El Flujo que originó esta entrega fue eliminado — no se puede reconstruir la firma."
        : !liveWebhook
          ? "El output ya no es un webhook en el Flujo actual."
          : null;

  async function handleReplay() {
    if (!log || !liveWebhook) return;
    let data: Record<string, unknown> = {};
    if (log.replayData) {
      try {
        const parsed = JSON.parse(log.replayData);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          data = parsed as Record<string, unknown>;
        }
      } catch {
        /* replayData corrupto — se reintenta con data vacía (los tokens no
           resolverán, pero la firma se construye igual). */
      }
    }
    setReplaying(true);
    setReplayResult(null);
    let response: Response;
    try {
      const req = await buildWebhookRequest(liveWebhook, data);
      response = await fetch(req.url, { ...req.init, signal: AbortSignal.timeout(10_000) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await persistReplay(log, liveWebhook, data, null, "", message);
      setReplaying(false);
      setReplayResult({ ok: false, error: message });
      return;
    }
    let snippet: string;
    try {
      const text = await response.text();
      snippet = text.length > 200 ? `${text.slice(0, 197)}...` : text;
    } catch {
      snippet = "";
    }
    const error = response.ok ? null : `El webhook respondió HTTP ${response.status}.`;
    await persistReplay(log, liveWebhook, data, response.status, snippet, error);
    setReplaying(false);
    setReplayResult(
      response.ok
        ? { ok: true, httpStatus: response.status, snippet }
        : { ok: false, error: error ?? "Error desconocido" },
    );
  }

  /** Persiste el intento de reenvío como una entrada nueva de `syncLogs`
   *  vinculada al mismo Flujo/run, con `retryCount = log.retryCount + 1`.
   *  Reusa `buildOutboundSyncLog` para enmascarar/truncar igual que la entrega
   *  original. El `secret` nunca se persiste. */
  async function persistReplay(
    original: SyncLog,
    output: WebhookOutput,
    data: Record<string, unknown>,
    status: number | null,
    snippet: string,
    error: string | null,
  ) {
    const req = await buildWebhookRequest(output, data);
    const replayDelivery: OutboundDelivery = {
      url: req.url,
      secret: output.secret,
      payload: req.payload,
      status,
      responseSnippet: snippet,
      error: error ?? undefined,
      attempts: 1,
      flowId: original.flowId,
      outputIndex: original.outputIndex,
      data,
    };
    const base = buildOutboundSyncLog(replayDelivery, original.eventType, original.runId);
    await integrationDb.syncLogs.add({
      id: uuid(),
      createdAt: nowIso(),
      ...base,
      retryCount: original.retryCount + 1,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-semibold">Detalle de Entrega</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="font-mono text-xs">{log.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                <Badge variant="outline" className="text-xs">
                  {log.direction === "inbound" ? "→ Entrada" : "← Salida"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                <Badge variant="outline" className="font-mono text-xs">
                  {log.provider}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Evento</p>
                <p className="text-sm">{log.eventType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <div className="flex items-center gap-2">
                  {log.status === "success" && (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="text-sm text-success">Exitoso</span>
                    </>
                  )}
                  {log.status === "error" && (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      <span className="text-sm text-destructive">Error</span>
                    </>
                  )}
                  {log.status === "pending" && (
                    <>
                      <Clock className="size-4 text-warning" />
                      <span className="text-sm text-warning">Pendiente</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">HTTP Status</p>
                <p className="text-sm">{log.httpStatus ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reintentos</p>
                <p className="text-sm">{log.retryCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Spec 033 A1 — Reenviar (replay). Reconstruye la request con la
                misma firma verificable de spec 032 §A; el secreto se recupera
                del Flujo vivo, no del log. Es una llamada real, hence el
                ConfirmDialog (criterio 025 §D). */}
            {canReplay && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Reenviar esta entrega</p>
                    <p className="text-xs text-muted-foreground">
                      Reconstruye la request con la misma firma HMAC verificable (spec 032 §A).
                    </p>
                  </div>
                  {log.runId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={() => navigate(`${ROUTES.flowHistory}?run=${log.runId}`)}
                    >
                      <ExternalLink className="size-3.5" />
                      Ver run
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => setConfirmReplay(true)}
                    disabled={replaying || replayDisabledReason !== null}
                  >
                    {replaying ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Reenviar
                      </>
                    )}
                  </Button>
                  {replayDisabledReason && (
                    <span className="text-xs text-muted-foreground">{replayDisabledReason}</span>
                  )}
                </div>
                {replayResult && (
                  <div
                    className={`mt-3 flex items-start gap-2 rounded-md p-2 text-sm ${
                      replayResult.ok
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {replayResult.ok ? (
                      <>
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0">
                          <p>Reenvío registrado — HTTP {replayResult.httpStatus}.</p>
                          {replayResult.snippet && (
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-background/60 p-2 text-xs">
                              <code>{replayResult.snippet}</code>
                            </pre>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                        <span className="break-words">{replayResult.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {log.errorMessage && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Error</p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{log.errorMessage}</p>
                </div>
              </div>
            )}

            {requestPayload != null && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Payload de Request
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  <code>{JSON.stringify(requestPayload, null, 2)}</code>
                </pre>
              </div>
            )}

            {log.responsePayload && log.responsePayload !== "" && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Payload de Response
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  <code>{String(log.responsePayload)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={confirmReplay}
          onOpenChange={setConfirmReplay}
          title="Reenviar entrega"
          description="Se enviará de nuevo el body firmado al destino. Es una llamada real al webhook."
          confirmLabel="Reenviar"
          confirmVariant="default"
          onConfirm={() => void handleReplay()}
        />
      </div>
    </div>
  );
}
