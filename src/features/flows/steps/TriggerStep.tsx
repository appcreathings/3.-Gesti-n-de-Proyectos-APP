import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, TestTube, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FlowRule, Trigger, PollFilter, PollTrigger, EventTrigger } from "@/domain/schemas/flow";
import { AppsScriptGuide } from "@/features/integrations/guides/AppsScriptGuide";
import {
  getConnections,
  resolveConnectionSecret,
  runConnectionProbe,
  type IntegrationConnection,
} from "@/integrations/connections";
import { HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE } from "@/features/flows/canvas/variables";
import { SampleExplorer } from "@/features/flows/canvas/SampleExplorer";
import { ROUTES } from "@/routes/paths";

interface Props {
  flow: FlowRule;
  updateFlow: (updates: Partial<FlowRule>) => void;
  /** Notifica registros de muestra reales cuando "Probar conexión" trae
   * datos — el canvas los pasa al paso de Transformación para poblar el
   * picker de mapeo de campos (spec 022 §A). `undefined` limpia una muestra
   * vieja (conexión cambiada, prueba fallida). */
  onSampleChange?: (sample: Record<string, unknown>[] | undefined) => void;
  /** Muestra viva (efímera del canvas o persistida en `flow.lastSample`)
   * que el `SampleExplorer` y el badge de cuenta deben mostrar en el
   * contexto del canvas — el `flow` que ve `TriggerStep` aquí se construye
   * sintéticamente en `TriggerNodeDrawer` sin `lastSample`, así que hay
   * que pasarlo por separado. Spec 025 §A (ext: explorador de muestra). */
  sample?: Record<string, unknown>[];
}

const TRIGGER_TYPES = [
  {
    value: "event",
    label: "Cuando ocurra un evento",
    icon: "📡",
    description: "Reaccionar a cambios en Hito",
  },
  {
    value: "poll-hubspot",
    label: "Cuando lleguen datos de HubSpot",
    icon: "🔶",
    description: "Traer contactos, deals o tickets",
  },
  {
    value: "poll-google-sheets",
    label: "Cuando lleguen filas de Google Sheets",
    icon: "📊",
    description: "Leer una hoja de cálculo",
  },
];

// Debe ser un subconjunto de `EventTriggerSchema.event` (domain/schemas/flow.ts),
// que a su vez debe coincidir con los DomainEvent que el store realmente emite.
const EVENT_OPTIONS = [
  { value: "task.statusChanged", label: "Tarea cambia de estado" },
  { value: "task.added", label: "Tarea creada" },
  { value: "task.commented", label: "Tarea comentada" },
  { value: "task.archived", label: "Tarea archivada" },
  { value: "task.unarchived", label: "Tarea desarchivada" },
  { value: "project.created", label: "Proyecto creado" },
  { value: "project.statusChanged", label: "Proyecto cambia de estado" },
  { value: "checklist.completed", label: "Checklist completado" },
  { value: "area.added", label: "Área añadida" },
  { value: "area.completed", label: "Área completada" },
  { value: "item.checked", label: "Ítem de checklist marcado" },
];

const HUBSPOT_OBJECT_TYPES = [
  { value: "contacts", label: "Contactos" },
  { value: "deals", label: "Deals" },
  { value: "tickets", label: "Tickets" },
];

const HUBSPOT_FIELDS_BY_TYPE = HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE;

const INTERVAL_OPTIONS = [
  { value: "60000", label: "Cada 1 minuto" },
  { value: "300000", label: "Cada 5 minutos" },
  { value: "600000", label: "Cada 10 minutos" },
  { value: "1800000", label: "Cada 30 minutos" },
];

export function TriggerStep({ flow, updateFlow, onSampleChange, sample }: Props) {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [guideProvider, setGuideProvider] = useState<"hubspot" | "google-sheets" | null>(null);
  const [hubspotConnections, setHubspotConnections] = useState<IntegrationConnection[]>([]);
  const [sheetsConnections, setSheetsConnections] = useState<IntegrationConnection[]>([]);

  // Preferimos la `sample` viva (estado del canvas, poblada al pulsar
  // "Probar conexión") sobre `flow.lastSample` (persistida en el FlowRule).
  // En el contexto del canvas, `flow` es sintético (`TriggerNodeDrawer`
  // construye `{ ...createEmptyFlow(""), trigger }`) y no lleva
  // `lastSample`, así que `flow.lastSample` solo funciona cuando se usa
  // el `TriggerStep` standalone. Spec 025 §A (ext: explorador de muestra).
  const displaySample = sample ?? flow.lastSample;

  useEffect(() => {
    getConnections("hubspot").then(setHubspotConnections);
    getConnections("google-sheets").then(setSheetsConnections);
  }, []);

  const activeTriggerValue =
    flow.trigger.type === "poll" ? `poll-${flow.trigger.provider}` : "event";

  const handleTriggerTypeChange = (value: string) => {
    let newTrigger: Trigger;
    switch (value) {
      case "event":
        newTrigger = { type: "event", event: "task.statusChanged" };
        break;
      case "poll-hubspot":
        newTrigger = {
          type: "poll",
          provider: "hubspot",
          config: {
            connectionId: "",
            objectType: "contacts",
            fields: ["email", "firstname", "lastname"],
            filters: [],
            intervalMs: 300000,
          },
        };
        break;
      case "poll-google-sheets":
        newTrigger = {
          type: "poll",
          provider: "google-sheets",
          config: { connectionId: "", fields: [], filters: [], intervalMs: 300000 },
        };
        break;
      default:
        return;
    }
    // Spec 025 §A: la muestra persistida pertenece al trigger anterior —
    // al cambiar de tipo de trigger (event↔poll, o provider entre poll),
    // los registros viejos ya no aplican a nada.
    clearStaleSample();
    updateFlow({ trigger: newTrigger });
  };

  const addFilter = () => {
    if (flow.trigger.type !== "poll") return;
    const pollTrigger = flow.trigger as PollTrigger;
    const newFilter: PollFilter = { field: "", op: "==", value: "" };
    updateFlow({
      trigger: {
        ...pollTrigger,
        config: {
          ...pollTrigger.config,
          filters: [...pollTrigger.config.filters, newFilter],
        },
      },
    });
  };

  const updateFilter = (index: number, updates: Partial<PollFilter>) => {
    if (flow.trigger.type !== "poll") return;
    const pollTrigger = flow.trigger as PollTrigger;
    const filters = [...pollTrigger.config.filters];
    filters[index] = { ...filters[index], ...updates };
    updateFlow({
      trigger: {
        ...pollTrigger,
        config: { ...pollTrigger.config, filters },
      },
    });
  };

  const removeFilter = (index: number) => {
    if (flow.trigger.type !== "poll") return;
    const pollTrigger = flow.trigger as PollTrigger;
    const filters = pollTrigger.config.filters.filter((_: PollFilter, i: number) => i !== index);
    updateFlow({
      trigger: {
        ...pollTrigger,
        config: { ...pollTrigger.config, filters },
      },
    });
  };

  const handleTestConnection = async () => {
    if (flow.trigger.type !== "poll") return;
    const pollTrigger = flow.trigger as PollTrigger;
    const connections = pollTrigger.provider === "hubspot" ? hubspotConnections : sheetsConnections;
    const connection = connections.find((c) => c.id === pollTrigger.config.connectionId);

    if (!connection) {
      setTestResult("❌ Selecciona una conexión.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    // NO limpiar la muestra anterior al inicio de la prueba — si la prueba
    // falla por algo transitorio (timeout, CORS), el explorador sigue
    // mostrando la muestra anterior en vez de quedarse vacío. Solo se
    // limpia si la prueba explícitamente falla (más abajo).

    try {
      const secret = await resolveConnectionSecret(connection.id);
      // Bug fix: antes se llamaba `testConnection` que siempre usaba la
      // operación default (`"contacts"` para HubSpot), ignorando el
      // `objectType` configurado en el trigger. Si el flujo era de deals,
      // la prueba traía contactos (campos equivocados) o fallaba si el
      // token no tenía scope de contacts. Ahora usamos `runConnectionProbe`
      // con la operación que corresponde al `objectType` del trigger.
      const operation =
        pollTrigger.provider === "hubspot"
          ? (pollTrigger.config.objectType ?? "contacts")
          : "read";
      const result = await runConnectionProbe(
        pollTrigger.provider,
        connection.config,
        secret,
        { operation },
      );
      setTestResult(result.ok ? `✅ ${result.detail}` : `❌ ${result.detail}`);
      if (result.ok) {
        // La muestra viaja por `onSampleChange` → canvas → builder, que
        // es quien la persiste en `flow.lastSample` al guardar (spec 025
        // §A). El `updateFlow` lo hace el builder al recibir la muestra
        // en `handleSampleChange` — aquí solo notificamos la muestra.
        onSampleChange?.(result.records);
      } else {
        // Prueba fallida: limpiar la muestra efímera del canvas — el
        // builder quitará `lastSample`/`lastSampleAt` al guardar, pero
        // en vivo ya no queremos que los selectores muestren campos
        // inválidos.
        onSampleChange?.(undefined);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
      // No limpiar en catch transitorio — la muestra anterior podría
      // seguir siendo válida. Solo limpiar si fue un error de la API.
    } finally {
      setIsTesting(false);
    }
  };

  /** Notifica al canvas/builder que la muestra vigente ya no aplica
   * y debe limpiarse. Lo que dispara es la subida del cambio (vía
   * `onSampleChange(undefined)`), no un mutate local de `flow.lastSample`
   * — el builder sincroniza su estado al recibir el callback y refresca
   * `flow.lastSample`/`lastSampleAt` que alimenta este badge. Spec 025 §A. */
  function clearStaleSample() {
    onSampleChange?.(undefined);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>¿Cuándo se ejecuta este flujo?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trigger Type Selector */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {TRIGGER_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTriggerTypeChange(type.value)}
                className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                  activeTriggerValue === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-3xl">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground">{type.description}</span>
              </button>
            ))}
          </div>

          {/* Event Trigger Configuration */}
          {flow.trigger.type === "event" && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Evento</Label>
                <Select
                  value={flow.trigger.event}
                  onChange={(e) =>
                    updateFlow({
                      trigger: { type: "event", event: e.target.value as EventTrigger["event"] } as Trigger,
                    })
                  }
                >
                  {EVENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Poll Trigger Configuration */}
          {flow.trigger.type === "poll" && (() => {
            const pollTrigger = flow.trigger as PollTrigger;
            const isHubspot = pollTrigger.provider === "hubspot";
            const providerLabel = isHubspot ? "HubSpot" : "Google Sheets";
            const connections = isHubspot ? hubspotConnections : sheetsConnections;
            return (
              <div className="space-y-6">
                {/* Setup Guide */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 size-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Configuración requerida
                      </p>
                      <p className="mt-1 text-xs text-blue-700">
                        Para conectar con {providerLabel} necesitas crear un proxy en Google Apps Script.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setGuideProvider(pollTrigger.provider)}
                      >
                        Ver guía paso a paso
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Connection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Conexión de {providerLabel}</h3>
                    <Link
                      to={ROUTES.integrations}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Gestionar conexiones →
                    </Link>
                  </div>
                  {connections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin conexiones de {providerLabel}. Crea una desde{" "}
                      <Link to={ROUTES.integrations} className="text-primary hover:underline">
                        Integraciones
                      </Link>{" "}
                      — se reutiliza aquí y en cualquier otro flujo, sin repetir credenciales.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Conexión</Label>
                      <Select
                        value={pollTrigger.config.connectionId}
                        onChange={(e) => {
                          // Spec 025 §A: la muestra persistida corresponde
                          // a otra conexión — limpiarla para no sembrar
                          // campos que la nueva conexión no traerá.
                          clearStaleSample();
                          updateFlow({
                            trigger: {
                              ...pollTrigger,
                              config: { ...pollTrigger.config, connectionId: e.target.value },
                            },
                          });
                        }}
                      >
                        <option value="">Selecciona una conexión...</option>
                        {connections.map((conn) => (
                          <option key={conn.id} value={conn.id}>
                            {conn.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>

                {isHubspot && (
                  <>
                    {/* Object Type */}
                    <div className="grid gap-2">
                      <Label>Tipo de objeto</Label>
                      <Select
                        value={pollTrigger.config.objectType ?? "contacts"}
                        onChange={(e) => {
                          // Spec 025 §A: los campos del sample dependen
                          // del objectType (contacts vs deals vs tickets)
                          // — al cambiar, limpiar la muestra vieja.
                          clearStaleSample();
                          updateFlow({
                            trigger: {
                              ...pollTrigger,
                              config: {
                                ...pollTrigger.config,
                                objectType: e.target.value as PollTrigger["config"]["objectType"],
                              },
                            },
                          });
                        }}
                      >
                        {HUBSPOT_OBJECT_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Filters */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Filtros (qué traer)</Label>
                        <Button size="sm" variant="outline" onClick={addFilter}>
                          <Plus className="size-4" />
                          Añadir filtro
                        </Button>
                      </div>
                      {pollTrigger.config.filters.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Sin filtros. Se traerán todos los registros.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pollTrigger.config.filters.map((filter: PollFilter, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <UIInput
                                value={filter.field}
                                onChange={(e) => updateFilter(idx, { field: e.target.value })}
                                placeholder="campo"
                                className="flex-1"
                              />
                              <Select
                                value={filter.op}
                                onChange={(e) => updateFilter(idx, { op: e.target.value as PollFilter["op"] })}
                                className="w-24"
                              >
                                <option value="==">==</option>
                                <option value="!=">!=</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                                <option value="in">in</option>
                                <option value="contains">contains</option>
                              </Select>
                              <UIInput
                                value={String(filter.value ?? "")}
                                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                                placeholder={filter.op === "in" ? "valor1, valor2, ..." : "valor"}
                                className="flex-1"
                              />
                              <Button size="icon" variant="ghost" onClick={() => removeFilter(idx)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="space-y-2">
                      <Label>Campos a traer</Label>
                      <div className="flex flex-wrap gap-2">
                        {HUBSPOT_FIELDS_BY_TYPE[(pollTrigger.config.objectType ?? "contacts") as keyof typeof HUBSPOT_FIELDS_BY_TYPE].map((field) => (
                          <Badge
                            key={field}
                            variant={pollTrigger.config.fields.includes(field) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const fields = pollTrigger.config.fields.includes(field)
                                ? pollTrigger.config.fields.filter((f: string) => f !== field)
                                : [...pollTrigger.config.fields, field];
                              updateFlow({
                                trigger: {
                                  ...pollTrigger,
                                  config: { ...pollTrigger.config, fields },
                                },
                              });
                            }}
                          >
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {!isHubspot && (
                  <p className="text-xs text-muted-foreground">
                    Se traen todas las columnas de la hoja (según el rango y la fila de encabezados
                    configurados en la conexión) — el mapeo a campos de Hito se hace en el paso de
                    Transformación.
                  </p>
                )}

                {/* Interval */}
                <div className="grid gap-2">
                  <Label>Intervalo de polling</Label>
                  <Select
                    value={String(pollTrigger.config.intervalMs)}
                    onChange={(e) =>
                      updateFlow({
                        trigger: {
                          ...pollTrigger,
                          config: { ...pollTrigger.config, intervalMs: Number(e.target.value) },
                        },
                      })
                    }
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Test Connection */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={isTesting || !pollTrigger.config.connectionId}
                  >
                    <TestTube className="size-4" />
                    {isTesting ? "Probando..." : "Probar conexión"}
                  </Button>
                  {testResult && (
                    <span className={`text-sm ${testResult.startsWith("✅") ? "text-success" : "text-destructive"}`}>
                      {testResult}
                    </span>
                  )}
                  {/* Spec 025 §A: badge con la muestra vigente (persistida
                    o efímera del canvas) — el usuario ve cuántos registros
                    trajo la última prueba y cuándo, sin tener que re-probar. */}
                  {displaySample && displaySample.length > 0 && flow.lastSampleAt && (
                    <Badge variant="secondary" className="gap-1 text-[10px]" title={`Última prueba: ${flow.lastSampleAt}`}>
                      Muestra: {displaySample.length} reg ·{" "}
                      {new Date(flow.lastSampleAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                  )}
                </div>

                {/* Spec 025 §A (ext): explorador de la muestra traída por
                  "Probar conexión". Antes solo se veía el badge — el
                  usuario tenía que abrir el drawer de Transformación para
                  saber qué campos traía la muestra. Ahora puede explorarlos
                  aquí mismo y copiar tokens `{{campo}}` para pegarlos en
                  cualquier campo interpolable del flujo. */}
                <SampleExplorer sample={displaySample} />
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {guideProvider && (
        <AppsScriptGuide
          open={guideProvider !== null}
          onOpenChange={(o) => !o && setGuideProvider(null)}
          provider={guideProvider}
        />
      )}
    </div>
  );
}
