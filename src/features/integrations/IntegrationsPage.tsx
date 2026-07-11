import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Webhook,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Plus,
  Lock,
  Unlock,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppsScriptGuide } from "./guides/AppsScriptGuide";
import { VaultSetupDialog } from "./VaultSetupDialog";
import { VaultSecuritySettings } from "./VaultSecuritySettings";
import { WebhookSubscriptionDialog } from "./WebhookSubscriptionDialog";
import { ConnectionDialog, PROVIDER_META } from "./components/ConnectionDialog";
import { useVaultStore } from "@/integrations/vault";
import {
  getWebhookSubscriptions,
  deleteWebhookSubscription,
} from "@/integrations/outbound/dispatcher";
import {
  getConnections,
  deleteConnection,
  resolveConnectionSecret,
  testConnection,
  markConnectionTested,
  type ConnectionProvider,
} from "@/integrations/connections";
import { triggerLabel } from "@/domain/labels";
import { ROUTES } from "@/routes/paths";
import type { WebhookSubscription, IntegrationConnection } from "@/storage/integration-db";

type GuideProvider = ConnectionProvider;

export function IntegrationsPage() {
  const navigate = useNavigate();
  const [guideProvider, setGuideProvider] = useState<GuideProvider | null>(null);
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<WebhookSubscription | undefined>();
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);

  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const hasMasterPassword = useVaultStore((s) => s.hasMasterPassword);
  const lock = useVaultStore((s) => s.lock);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    const subs = await getWebhookSubscriptions();
    setSubscriptions(subs);
  }

  const handleVaultClick = () => {
    if (isUnlocked) {
      lock();
    } else {
      setVaultDialogOpen(true);
    }
  };

  return (
    <>
      <Helmet>
        <title>Integraciones | Hito</title>
        <meta name="description" content="Conecta Hito con HubSpot, Google Sheets, Zapier y más." />
      </Helmet>

      <div>
        <PageHeader
          label="Integraciones"
          title="Integraciones"
          description="Conexiones reutilizables a herramientas externas. Se configuran una sola vez aquí; los Flujos las usan por referencia, sin repetir credenciales. Todo corre en tu navegador — sin servidores intermedios."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/app/integrations/logs")}>
                <FileText className="size-4" />
                Historial
              </Button>
              <Button variant="outline" size="sm" onClick={handleVaultClick}>
                {isUnlocked ? (
                  <>
                    <Unlock className="size-4 text-success" />
                    Bloquear
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    {hasMasterPassword ? "Desbloquear vault" : "Configurar vault"}
                  </>
                )}
              </Button>
              <Button onClick={() => navigate(ROUTES.flowNew)}>
                <Plus className="size-4" />
                Nuevo flujo
              </Button>
            </div>
          }
        />

        <Tabs defaultValue="hubspot" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hubspot">HubSpot</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
          </TabsList>

          <TabsContent value="hubspot">
            <div className="grid gap-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Requiere proxy de Google Apps Script</p>
                    <p className="text-muted-foreground">
                      HubSpot no permite llamadas directas desde el navegador (CORS). Necesitas
                      crear un proxy gratuito en Google Apps Script. La guía te lleva paso a paso.
                    </p>
                  </div>
                </div>
              </div>

              <ProviderConnectionsPanel
                provider="hubspot"
                description="Sincroniza contactos, negocios (deals) y tickets desde HubSpot hacia Hito. La frecuencia de sondeo se configura por Flujo, no aquí."
                onOpenGuide={() => setGuideProvider("hubspot")}
              />
            </div>
          </TabsContent>

          <TabsContent value="sheets">
            <div className="grid gap-6">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Vía proxy de Google Apps Script (igual que HubSpot)</p>
                    <p className="text-muted-foreground">
                      Sin gapi ni OAuth de navegador: el proxy corre bajo tu propia cuenta de Google,
                      que ya tiene acceso a tus hojas. La guía te lleva paso a paso.
                    </p>
                  </div>
                </div>
              </div>

              <ProviderConnectionsPanel
                provider="google-sheets"
                description="Lee filas de una hoja de cálculo de Google. La frecuencia de sondeo se configura por Flujo, no aquí."
                onOpenGuide={() => setGuideProvider("google-sheets")}
              />
            </div>
          </TabsContent>

          <TabsContent value="webhooks">
            <Panel
              label="Salida"
              title="Webhooks de salida"
              description="Notifica a sistemas externos cuando ocurran eventos en Hito."
              actions={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingSubscription(undefined);
                    setWebhookDialogOpen(true);
                  }}
                >
                  <Webhook className="size-4" />
                  Nueva suscripción
                </Button>
              }
            >
              <div className="space-y-4">
                {subscriptions.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                    <Webhook className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">Sin suscripciones activas</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Crea una suscripción para enviar eventos a Zapier, Make, Slack o cualquier URL.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sub.name}</p>
                          <p className="truncate text-xs text-muted-foreground font-mono">
                            {sub.url}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-[10px]">
                                {triggerLabel[event] ?? event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant={sub.enabled ? "success" : "outline"} className="text-[10px]">
                          {sub.enabled ? "Activo" : "Inactivo"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSubscription(sub);
                            setWebhookDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWebhookSubscription(sub.id).then(loadSubscriptions)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="email">
            <ProviderConnectionsPanel
              provider="email"
              description="Envía notificaciones por correo cuando ocurran eventos clave, vía tu proxy de Apps Script."
              onOpenGuide={() => setGuideProvider("email")}
            />
          </TabsContent>

          <TabsContent value="security">
            <VaultSecuritySettings />
          </TabsContent>
        </Tabs>
      </div>

      {guideProvider && (
        <AppsScriptGuide
          open={guideProvider !== null}
          onOpenChange={(o) => !o && setGuideProvider(null)}
          provider={guideProvider}
        />
      )}
      <VaultSetupDialog open={vaultDialogOpen} onOpenChange={setVaultDialogOpen} />
      <WebhookSubscriptionDialog
        open={webhookDialogOpen}
        onOpenChange={setWebhookDialogOpen}
        subscription={editingSubscription}
        onSaved={loadSubscriptions}
      />
    </>
  );
}

/** CRUD de conexiones para un proveedor dado (HubSpot / Google Sheets / Email).
 * Reemplaza los mockups previos (estado local, sin persistencia) por lectura y
 * escritura real en `integrationDb.integrationConnections`. */
function ProviderConnectionsPanel({
  provider,
  description,
  onOpenGuide,
}: {
  provider: ConnectionProvider;
  description: string;
  onOpenGuide?: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationConnection | undefined>();
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setConnections(await getConnections(provider));
  }, [provider]);

  useEffect(() => {
    load();
  }, [load]);

  const needsVaultGate = Boolean(meta.secretLabel) && !isUnlocked;

  async function handleQuickTest(conn: IntegrationConnection) {
    setTestingId(conn.id);
    try {
      const secret = conn.encryptedSecret
        ? await resolveConnectionSecret(conn.id).catch(() => null)
        : null;
      const result = await testConnection(provider, conn.config, secret);
      await markConnectionTested(conn.id, result.ok);
      await load();
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteConnection(id);
    await load();
  }

  return (
    <Panel
      label={meta.secretLabel ? "Entrada" : "Configuración"}
      title={meta.label}
      description={description}
      actions={
        <div className="flex gap-2">
          {onOpenGuide && (
            <Button variant="outline" size="sm" onClick={onOpenGuide}>
              <BookOpen className="size-4" />
              Guía de configuración
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
            disabled={needsVaultGate}
          >
            <Plus className="size-4" />
            Nueva conexión
          </Button>
        </div>
      }
    >
      {needsVaultGate && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
          Desbloquea el vault para crear una conexión de {meta.label} (guarda un secreto cifrado).
        </div>
      )}

      {connections.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <p className="text-sm font-medium">Sin conexiones configuradas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crea una conexión de {meta.label}; los flujos la usarán por referencia, sin volver a
            pedir credenciales.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{conn.name}</p>
                <p className="truncate text-xs text-muted-foreground font-mono">
                  {String(conn.config.proxyUrl ?? "")}
                </p>
              </div>
              {conn.lastTestedAt && (
                <Badge variant={conn.lastTestOk ? "success" : "destructive"} className="text-[10px]">
                  {conn.lastTestOk ? "Verificada" : "Falló última prueba"}
                </Badge>
              )}
              <Badge variant={conn.enabled ? "success" : "outline"} className="text-[10px]">
                {conn.enabled ? "Activa" : "Inactiva"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleQuickTest(conn)}
                disabled={testingId === conn.id}
              >
                {testingId === conn.id ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Probar
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditing(conn);
                  setDialogOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(conn.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={provider}
        connection={editing}
        onSaved={load}
      />
    </Panel>
  );
}
