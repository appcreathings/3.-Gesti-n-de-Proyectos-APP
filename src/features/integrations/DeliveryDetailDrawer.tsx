import { X, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SyncLog } from "@/storage/integration-db";

interface Props {
  log: SyncLog | null;
  onClose: () => void;
}

export function DeliveryDetailDrawer({ log, onClose }: Props) {
  if (!log) return null;

  let requestPayload: unknown = null;
  try {
    requestPayload = JSON.parse(log.requestPayload);
  } catch {
    // ignore
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
      </div>
    </div>
  );
}
