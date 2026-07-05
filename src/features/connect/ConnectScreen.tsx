import { FolderOpen, RefreshCw, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/useAppStore";

/** First-run / reconnect gate: pick the local folder where JSON data lives. */
export function ConnectScreen() {
  const connection = useAppStore((s) => s.connection);
  const error = useAppStore((s) => s.error);
  const adapterKind = useAppStore((s) => s.adapter.kind);
  const connectFolder = useAppStore((s) => s.connectFolder);
  const reconnectFolder = useAppStore((s) => s.reconnectFolder);

  const needsReconnect = connection === "needs-reconnect";

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen className="size-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">
              {needsReconnect ? "Reconecta tu carpeta" : "Elige una carpeta de datos"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {needsReconnect
                ? "Por seguridad, el navegador necesita que vuelvas a autorizar el acceso a tu carpeta."
                : "Tus proyectos se guardarán como archivos .json dentro de la carpeta que elijas. Nada sale de tu equipo."}
            </p>
          </div>

          {needsReconnect ? (
            <Button onClick={reconnectFolder} className="w-full">
              <RefreshCw className="size-4" />
              Reconectar carpeta
            </Button>
          ) : (
            <Button onClick={connectFolder} className="w-full">
              <FolderInput className="size-4" />
              Elegir carpeta de datos
            </Button>
          )}

          {adapterKind === "download" && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-foreground">
              Tu navegador no soporta guardado directo en carpeta. Los datos se
              guardan en el navegador; usa Exportar/Importar para respaldar.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
