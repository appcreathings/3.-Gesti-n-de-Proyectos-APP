import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppGate } from "@/components/layout/AppGate";
import { ProjectsLayout } from "@/features/projects/ProjectsLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import { useAiConfigStore } from "@/store/useAiConfigStore";

// Route-level code-splitting: each page ships in its own chunk.
const LandingPage = lazy(() =>
  import("@/features/landing/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import("@/features/products/ProductsPage").then((m) => ({ default: m.ProductsPage })),
);
const ProjectsPage = lazy(() =>
  import("@/features/projects/ProjectsPage").then((m) => ({ default: m.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import("@/features/projects/ProjectDetailPage").then((m) => ({
    default: m.ProjectDetailPage,
  })),
);
const QuartersPage = lazy(() =>
  import("@/features/quarters/QuartersPage").then((m) => ({ default: m.QuartersPage })),
);
const LibraryPage = lazy(() =>
  import("@/features/library/LibraryPage").then((m) => ({ default: m.LibraryPage })),
);
const AutomationsPage = lazy(() =>
  import("@/features/automations/AutomationsPage").then((m) => ({
    default: m.AutomationsPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("@/features/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const NotFoundPage = lazy(() =>
  import("@/features/not-found/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const AlternativaTrelloPage = lazy(() =>
  import("@/features/seo/AlternativaTrelloPage").then((m) => ({
    default: m.AlternativaTrelloPage,
  })),
);
const AlternativaNotionPage = lazy(() =>
  import("@/features/seo/AlternativaNotionPage").then((m) => ({
    default: m.AlternativaNotionPage,
  })),
);
const GestorOfflinePage = lazy(() =>
  import("@/features/seo/GestorOfflinePage").then((m) => ({
    default: m.GestorOfflinePage,
  })),
);
const ChangelogPage = lazy(() =>
  import("@/features/seo/ChangelogPage").then((m) => ({ default: m.ChangelogPage })),
);
const DocsPage = lazy(() =>
  import("@/features/seo/DocsPage").then((m) => ({ default: m.DocsPage })),
);
const BlogIndexPage = lazy(() =>
  import("@/features/blog/pages/BlogIndexPage").then((m) => ({
    default: m.BlogIndexPage,
  })),
);
const BlogPostPage = lazy(() =>
  import("@/features/blog/pages/BlogPostPage").then((m) => ({
    default: m.BlogPostPage,
  })),
);
const MyTasksPage = lazy(() =>
  import("@/features/my-tasks/MyTasksPage").then((m) => ({
    default: m.MyTasksPage,
  })),
);

function page(el: ReactNode) {
  return <Suspense fallback={<Loading />}>{el}</Suspense>;
}

const router = createBrowserRouter([
  { path: "/", element: page(<LandingPage />) },
  { path: "/alternativa-trello", element: page(<AlternativaTrelloPage />) },
  { path: "/alternativa-notion-local", element: page(<AlternativaNotionPage />) },
  { path: "/gestor-proyectos-offline", element: page(<GestorOfflinePage />) },
  { path: "/changelog", element: page(<ChangelogPage />) },
  { path: "/docs", element: page(<DocsPage />) },
  { path: "/blogs", element: page(<BlogIndexPage />) },
  { path: "/blogs/:slug", element: page(<BlogPostPage />) },
  // Redirecciones por renombre de slugs (SEO-friendly, conserva link equity)
  { path: "/blog", element: <Navigate to="/blogs" replace /> },
  {
    path: "/blogs/soberania-datos-ventaja-competitiva",
    element: <Navigate to="/blogs/gestion-proyectos-sin-nube" replace />,
  },
  {
    path: "/blogs/documentar-procesos-equipo",
    element: <Navigate to="/blogs/como-documentar-procesos-equipos" replace />,
  },
  {
    path: "/blogs/asistente-ia-sin-entrenar-modelos",
    element: <Navigate to="/blogs/asistente-ia-proyectos-sin-datos" replace />,
  },
  {
    path: "/blogs/menos-herramientas-mas-claridad",
    element: <Navigate to="/blogs/organizar-proyectos-tareas-jerarquia" replace />,
  },
  {
    path: "/blogs/automatizaciones-sin-nube",
    element: <Navigate to="/blogs/automatizar-tareas-sin-nube" replace />,
  },
  {
    path: "/app",
    element: <AppGate />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: page(<DashboardPage />) },
          { path: "products", element: page(<ProductsPage />) },
          {
            path: "projects",
            element: <ProjectsLayout />,
            children: [
              { index: true, element: page(<ProjectsPage />) },
              { path: ":id", element: page(<ProjectDetailPage />) },
            ],
          },
          { path: "my-tasks", element: page(<MyTasksPage />) },
          { path: "quarters", element: page(<QuartersPage />) },
          { path: "library", element: page(<LibraryPage />) },
          { path: "automations", element: page(<AutomationsPage />) },
          { path: "notifications", element: page(<NotificationsPage />) },
          { path: "settings", element: page(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: "*", element: page(<NotFoundPage />) },
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
    <HelmetProvider>
      <Helmet defaultTitle="Hito — Gestión de proyectos local-first" />
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </HelmetProvider>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}
