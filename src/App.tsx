import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConnectScreen } from "@/features/connect/ConnectScreen";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { LibraryPage } from "@/features/library/LibraryPage";
import { AutomationsPage } from "@/features/automations/AutomationsPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import { useAiConfigStore } from "@/store/useAiConfigStore";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "automations", element: <AutomationsPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  const connection = useAppStore((s) => s.connection);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const hydrated = useDataStore((s) => s.hydrated);
  const hydrate = useDataStore((s) => s.hydrate);
  const runTemporal = useDataStore((s) => s.runTemporal);

  useEffect(() => {
    void bootstrap();
    void useAiConfigStore.getState().hydrate();
  }, [bootstrap]);

  useEffect(() => {
    if (connection === "ready") void hydrate();
  }, [connection, hydrate]);

  // Temporal evaluation (M4): run on open (app.opened) and when the window regains focus.
  useEffect(() => {
    if (connection !== "ready" || !hydrated) return;
    void runTemporal();
    const onFocus = () => void runTemporal();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [connection, hydrated, runTemporal]);

  return (
    <ThemeProvider>
      {connection === "initializing" ? (
        <Loading />
      ) : connection === "ready" ? (
        hydrated ? (
          <RouterProvider router={router} />
        ) : (
          <Loading />
        )
      ) : (
        <ConnectScreen />
      )}
    </ThemeProvider>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}
