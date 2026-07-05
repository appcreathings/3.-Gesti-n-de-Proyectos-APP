import { Suspense, lazy, useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  Library,
  Workflow,
  Bell,
  Settings,
  HardDriveDownload,
  CheckCircle2,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import { useChatStore } from "@/store/useChatStore";
import { CommandPalette } from "@/features/command/CommandPalette";
import { ROUTES } from "@/routes/paths";

// Lazy: solo se descarga la primera vez que se abre el panel (Ctrl/Cmd+J).
const AssistantPanel = lazy(() =>
  import("@/features/assistant/AssistantPanel").then((m) => ({
    default: m.AssistantPanel,
  })),
);

const NAV = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: ROUTES.products, label: "Productos", icon: Package },
  { to: ROUTES.projects, label: "Proyectos", icon: FolderKanban },
  { to: ROUTES.library(), label: "Biblioteca", icon: Library },
  { to: ROUTES.automations, label: "Automatizaciones", icon: Workflow },
  { to: ROUTES.notifications, label: "Notificaciones", icon: Bell },
  { to: ROUTES.settings(), label: "Ajustes", icon: Settings },
];

export function AppLayout() {
  const adapterKind = useAppStore((s) => s.adapter.kind);
  const unread = useDataStore((s) => s.notifications.filter((n) => !n.read).length);
  const assistantOpen = useChatStore((s) => s.open);
  const toggleAssistant = useChatStore((s) => s.toggleOpen);

  // Ctrl/Cmd+J toggles the assistant (same pattern as the Cmd+K palette).
  // Registered here (not in AssistantPanel) so it works while the panel is unmounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleAssistant();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleAssistant]);

  return (
    <div className="flex h-full">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card/40">
        <Link to={ROUTES.landing} className="flex h-16 items-center gap-2 px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderKanban className="size-4" />
          </div>
          <span className="text-sm font-semibold">Hito</span>
        </Link>
        {/* Command palette trigger */}
        <button
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
            );
          }}
          className="mx-3 mb-1 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded border bg-background px-1.5 text-[10px] font-mono">⌘K</kbd>
        </button>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {to === ROUTES.notifications && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        {/* Assistant toggle */}
        <button
          onClick={() => toggleAssistant()}
          aria-pressed={assistantOpen}
          className={cn(
            "mx-3 mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            assistantOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Sparkles className="size-4" />
          <span className="flex-1 text-left">Asistente</span>
          <kbd className="rounded border bg-background px-1.5 text-[10px] font-mono">⌘J</kbd>
        </button>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {adapterKind === "filesystem" ? (
              <>
                <CheckCircle2 className="size-3.5 text-success" />
                Guardado en carpeta local
              </>
            ) : (
              <>
                <HardDriveDownload className="size-3.5 text-warning" />
                Modo export/import
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global AI assistant — lazy-mounted while open; the chat lives in useChatStore */}
      {assistantOpen && (
        <Suspense fallback={null}>
          <AssistantPanel />
        </Suspense>
      )}

      {/* Global command palette — mounted once at layout level */}
      <CommandPalette />
    </div>
  );
}
