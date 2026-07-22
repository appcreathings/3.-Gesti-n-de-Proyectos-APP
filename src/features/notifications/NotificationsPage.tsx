import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Bell,
  BellOff,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCheck,
  Trash2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import type { Notification, Severity } from "@/domain/schemas";
import { resolveNotificationRoute } from "./notification-route";

const SEVERITY: Record<Severity, { icon: LucideIcon; variant: BadgeProps["variant"]; label: string }> = {
  info: { icon: Info, variant: "secondary", label: "Info" },
  warning: { icon: AlertTriangle, variant: "warning", label: "Aviso" },
  critical: { icon: AlertOctagon, variant: "destructive", label: "Crítico" },
};

type Filter = "all" | "unread";

export function NotificationsPage() {
  return (
    <>
      <Helmet>
        <title>Notificaciones | Hito</title>
        <meta name="description" content="Vencidos, próximos a vencer y proyectos estancados en Hito." />
      </Helmet>
      <NotificationsContent />
    </>
  );
}

function NotificationsContent() {
  const navigate = useNavigate();
  const notifications = useDataStore((s) => s.notifications);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);
  const clearAll = useDataStore((s) => s.clearNotifications);

  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter],
  );

  const open = (n: Notification) => {
    if (!n.read) void markRead(n.id);
    const route = resolveNotificationRoute(n.entityRef);
    if (route) navigate(route);
  };

  return (
    <div>
      <PageHeader
        label="Notificaciones"
        title="Notificaciones"
        description="Vencidos, próximos a vencer y proyectos estancados. Se recalculan al abrir la app."
        actions={
          notifications.length > 0 ? (
            <>
              <Button variant="outline" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
                <CheckCheck className="size-4" />
                Marcar todas
              </Button>
              <Button variant="outline" onClick={() => setConfirmClear(true)}>
                <Trash2 className="size-4" />
                Limpiar
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">No leídas ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {visible.length === 0 ? (
            <EmptyState
              icon={filter === "unread" ? BellOff : Bell}
              title={filter === "unread" ? "No hay notificaciones sin leer" : "Sin notificaciones"}
              description="Cuando una fecha venza o un proyecto se estanque, aparecerá aquí."
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((n) => {
                const meta = SEVERITY[n.severity];
                const Icon = meta.icon;
                const linkable = Boolean(n.entityRef?.projectId || n.entityRef?.kind === "flow");
                return (
                  <li
                    key={n.id}
                    onClick={() => open(n)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                      linkable && "cursor-pointer hover:bg-accent",
                      !n.read && "border-l-2 border-l-primary bg-card",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        n.severity === "critical"
                          ? "text-destructive"
                          : n.severity === "warning"
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <span>{relativeTime(n.createdAt)}</span>
                        {!n.read && <span className="text-primary">• Nueva</span>}
                      </div>
                    </div>
                    {linkable && <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpiar notificaciones"
        description="Se eliminarán todas las notificaciones. Esta acción no se puede deshacer."
        confirmLabel="Limpiar"
        onConfirm={() => void clearAll()}
      />
    </div>
  );
}

/** Compact relative time (es). Falls back to a local date for older items. */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} día${days === 1 ? "" : "s"}`;
  return new Date(iso).toLocaleDateString();
}
