import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderKanban,
  CalendarRange,
  Calendar,
  Library,
  Workflow,
  Bell,
  Settings,
  HardDriveDownload,
  CheckCircle2,
  Search,
  Sparkles,
  Menu,
  MoreHorizontal,
  X,
  UserCheck,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import { useChatStore } from "@/store/useChatStore";
import { CommandPalette } from "@/features/command/CommandPalette";
import { ProjectTree } from "@/components/layout/ProjectTree";
import { ROUTES } from "@/routes/paths";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { QuickAddButton } from "@/components/QuickAddButton";
import { QuickAddTask } from "@/components/QuickAddTask";

// Lazy: solo se descarga la primera vez que se abre el panel (Ctrl/Cmd+J).
// Si falla el import (chunk desactualizado tras deploy), recarga la página una vez.
const AssistantPanel = lazy(() => {
  const RELOAD_KEY = "hito:assistant-reload";

  const doImport = import("@/features/assistant/AssistantPanel").then((m) => ({
    default: m.AssistantPanel,
  }));

  doImport.catch(() => {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }
  });

  return doImport;
});

const NAV = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: ROUTES.products, label: "Productos", icon: Package },
  { to: ROUTES.projects, label: "Proyectos", icon: FolderKanban },
  { to: ROUTES.myTasks, label: "Mis tareas", icon: UserCheck },
  { to: ROUTES.daily, label: "Daily Standup", icon: Calendar },
  { to: ROUTES.library(), label: "Biblioteca", icon: Library },
  { to: ROUTES.quarters, label: "Trimestres", icon: CalendarRange },
  { to: ROUTES.flows, label: "Flujos", icon: Workflow },
  { to: ROUTES.integrations, label: "Integraciones", icon: Webhook },
  { to: ROUTES.notifications, label: "Notificaciones", icon: Bell },
  { to: ROUTES.settings(), label: "Ajustes", icon: Settings },
];

// Destinos primarios mostrados en la barra inferior móvil (alcanzables con el pulgar).
// El resto de secciones (Automatizaciones, Notificaciones, Ajustes, Asistente) vive
// detrás del botón "Más", que abre el drawer completo.
const MOBILE_PRIMARY_NAV = NAV.slice(0, 4);

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const adapterKind = useAppStore((s) => s.adapter.kind);
  const unread = useDataStore((s) => s.notifications.filter((n) => !n.read).length);
  const assistantOpen = useChatStore((s) => s.open);
  const toggleAssistant = useChatStore((s) => s.toggleOpen);

  return (
    <>
      <Link
        to={ROUTES.landing}
        onClick={onNavClick}
        className="flex h-14 items-center gap-2 px-5"
      >
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <FolderKanban className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Hito</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          v0.1
        </span>
      </Link>
      {/* Command palette trigger */}
      <button
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
          );
        }}
        className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border border-border/70 bg-muted px-1.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <div key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavClick}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-foreground/5 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )
              }
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {to === ROUTES.notifications && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
                  {unread}
                </span>
              )}
            </NavLink>
            {/* Lightweight Producto → Proyecto tree for quick jumps (spec 008). */}
            {to === ROUTES.projects && <ProjectTree onNavigate={onNavClick} className="mt-0.5" />}
          </div>
        ))}
      </nav>
      {/* Assistant toggle (treated as a nav row) */}
      <div className="px-3 pb-3">
        <button
          onClick={() => {
            toggleAssistant();
            onNavClick?.();
          }}
          aria-pressed={assistantOpen}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            assistantOpen
              ? "bg-foreground/5 text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Sparkles className="size-4" />
          <span className="flex-1 text-left">Asistente</span>
          <kbd className="rounded border border-border/70 bg-muted px-1.5 text-[10px] font-mono">
            ⌘J
          </kbd>
        </button>
      </div>
      <div className="border-t border-border/70 px-5 py-3 font-mono text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {adapterKind === "filesystem" ? (
            <>
              <CheckCircle2 className="size-3.5 text-success" />
              sincronizado · carpeta local
            </>
          ) : (
            <>
              <HardDriveDownload className="size-3.5 text-warning" />
              modo export/import
            </>
          )}
        </div>
      </div>
    </>
  );
}

function MobileBottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const unread = useDataStore((s) => s.notifications.filter((n) => !n.read).length);
  const assistantOpen = useChatStore((s) => s.open);
  const toggleAssistant = useChatStore((s) => s.toggleOpen);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navegación principal"
    >
      {MOBILE_PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          <Icon className="size-5" />
          <span>{label}</span>
        </NavLink>
      ))}
      <button
        onClick={() => toggleAssistant()}
        aria-pressed={assistantOpen}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
          assistantOpen ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label="Asistente"
      >
        <Sparkles className="size-5" />
        <span>Asistente</span>
      </button>
      <button
        onClick={onMoreClick}
        className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground"
        aria-label="Más opciones"
      >
        <MoreHorizontal className="size-5" />
        <span>Más</span>
        {unread > 0 && (
          <span className="absolute right-[calc(50%-20px)] top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </nav>
  );
}

export function AppLayout() {
  const assistantOpen = useChatStore((s) => s.open);
  const toggleAssistant = useChatStore((s) => s.toggleOpen);
  const isDesktop = useBreakpoint("lg");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Close sidebar on Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Ctrl/Cmd+J toggles the assistant (same pattern as the Cmd+K palette).
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

  // Global keyboard shortcuts (spec 017)
  const toggleShortcutsModal = useCallback(() => {
    setShortcutsModalOpen((prev) => !prev);
  }, []);

  const toggleQuickAdd = useCallback(() => {
    setQuickAddOpen((prev) => !prev);
  }, []);

  const shortcuts = useMemo(
    () => ({
      "mod+/": toggleShortcutsModal,
      "mod+n": toggleQuickAdd,
    }),
    [toggleShortcutsModal, toggleQuickAdd],
  );

  useKeyboardShortcuts(shortcuts);

  // Lock body scroll when drawer or assistant is open on mobile
  useEffect(() => {
    const locked = sidebarOpen || (assistantOpen && !isDesktop);
    if (locked) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen, assistantOpen, isDesktop]);

  return (
    <div className="flex h-full">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border/70 bg-background lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {!isDesktop && (
        <div
          className={cn(
            "fixed inset-0 z-40 transition-all duration-300 ease-in-out",
            sidebarOpen ? "" : "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out",
              sidebarOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border/70 bg-background transition-transform duration-300 ease-in-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-14 items-center justify-end px-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarContent onNavClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <Link to={ROUTES.landing} className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
              <FolderKanban className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Hito</span>
          </Link>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:py-12">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — thumb-reachable primary destinations */}
      {!isDesktop && <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />}

      {/* Global AI assistant — lazy-mounted while open; the chat lives in useChatStore */}
      {assistantOpen && (
        <Suspense fallback={null}>
          <AssistantPanel />
        </Suspense>
      )}

      {/* Global command palette — mounted once at layout level */}
      <CommandPalette />

      {/* Keyboard shortcuts modal (spec 017) */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Quick add task (spec 017) */}
      <QuickAddButton onClick={toggleQuickAdd} />
      <QuickAddTask open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
