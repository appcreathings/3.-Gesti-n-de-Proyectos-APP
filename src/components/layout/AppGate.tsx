import { Outlet } from "react-router-dom";
import { ConnectScreen } from "@/features/connect/ConnectScreen";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";

/** Gate for everything under /app: requires a connected + hydrated workspace before rendering. */
export function AppGate() {
  const connection = useAppStore((s) => s.connection);
  const hydrated = useDataStore((s) => s.hydrated);

  if (connection === "initializing") return <Loading />;
  if (connection !== "ready") return <ConnectScreen />;
  if (!hydrated) return <Loading />;

  return <Outlet />;
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}
