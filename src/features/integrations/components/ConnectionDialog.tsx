import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Play } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useVaultStore } from "@/integrations/vault";
import {
  createConnection,
  updateConnection,
  resolveConnectionSecret,
  testConnection,
  runConnectionProbe,
  PROBE_OPERATIONS_BY_PROVIDER,
  type ConnectionProvider,
  type ConnectionTestResult,
  type ConnectionProbeResult,
  type ProbeOperation,
} from "@/integrations/connections";
import type { IntegrationConnection } from "@/storage/integration-db";

interface ProviderField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface ProviderMeta {
  label: string;
  secretLabel?: string;
  secretPlaceholder?: string;
  /** El secreto se muestra/cifra pero no es obligatorio para guardar (ej. el
   * inbox de Make/Zapier, que puede ser abierto). */
  secretOptional?: boolean;
  fields: ProviderField[];
}

export const PROVIDER_META: Record<ConnectionProvider, ProviderMeta> = {
  hubspot: {
    label: "HubSpot",
    secretLabel: "Access Token",
    secretPlaceholder: "pat-na1-...",
    fields: [
      {
        key: "proxyUrl",
        label: "Proxy URL",
        placeholder: "https://script.google.com/macros/s/.../exec",
        required: true,
      },
    ],
  },
  "google-sheets": {
    label: "Google Sheets",
    fields: [
      {
        key: "proxyUrl",
        label: "Proxy URL",
        placeholder: "https://script.google.com/macros/s/.../exec",
        required: true,
      },
      {
        key: "spreadsheetId",
        label: "ID del Spreadsheet",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        required: true,
      },
      { key: "range", label: "Rango", placeholder: "Tasks!A2:F", required: true },
      { key: "headerRow", label: "Fila de encabezados", placeholder: "1" },
    ],
  },
  email: {
    label: "Email",
    fields: [
      {
        key: "proxyUrl",
        label: "Proxy URL",
        placeholder: "https://script.google.com/macros/s/.../exec",
        required: true,
      },
      { key: "fromEmail", label: "Email remitente", placeholder: "notificaciones@tuempresa.com" },
    ],
  },
  "webhook-inbox": {
    // El secreto del inbox es OPCIONAL (un inbox abierto no lo requiere), así
    // que se pide como secreto cifrado (`secretLabel`) pero el `canSave` no lo
    // exige — a diferencia de HubSpot, esta conexión no marca `required` sobre
    // el secreto y `needsSecret` solo controla si se muestra/cifra el campo.
    label: "Make/Zapier (inbox)",
    secretLabel: "Secreto del inbox (opcional)",
    secretPlaceholder: "un-token-compartido-con-make-zapier",
    secretOptional: true,
    fields: [
      {
        key: "proxyUrl",
        label: "Proxy URL del inbox",
        placeholder: "https://script.google.com/macros/s/.../exec",
        required: true,
      },
    ],
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ConnectionProvider;
  connection?: IntegrationConnection;
  onSaved: () => void;
}

export function ConnectionDialog({ open, onOpenChange, provider, connection, onSaved }: Props) {
  const meta = PROVIDER_META[provider];
  const isEditing = Boolean(connection);
  const needsSecret = Boolean(meta.secretLabel);

  const [name, setName] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [secretValue, setSecretValue] = useState("");
  const [secretTouched, setSecretTouched] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const probeOperations = PROBE_OPERATIONS_BY_PROVIDER[provider];
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [probeOperation, setProbeOperation] = useState<ProbeOperation>(probeOperations[0].value);
  const [customPath, setCustomPath] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [probeResult, setProbeResult] = useState<ConnectionProbeResult | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(connection?.name ?? "");
    const initial: Record<string, string> = {};
    for (const field of meta.fields) {
      const value = connection?.config[field.key];
      initial[field.key] = typeof value === "string" ? value : "";
    }
    setFieldValues(initial);
    setSecretValue(connection?.encryptedSecret ? "••••••••••••" : "");
    setSecretTouched(false);
    setTestResult(null);
    setExplorerOpen(false);
    setProbeOperation(probeOperations[0].value);
    setCustomPath("");
    setTestRecipient("");
    setProbeResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connection, meta.fields, provider]);

  function buildConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const field of meta.fields) {
      config[field.key] = (fieldValues[field.key] ?? "").trim();
    }
    return config;
  }

  const canSave =
    name.trim().length > 0 &&
    meta.fields.filter((f) => f.required).every((f) => (fieldValues[f.key] ?? "").trim().length > 0) &&
    (!needsSecret || meta.secretOptional || isEditing || secretValue.trim().length > 0);

  async function resolveSecretForProbe(): Promise<string | null> {
    if (!needsSecret) return null;
    if (secretTouched) return secretValue.trim() || null;
    if (connection?.encryptedSecret) {
      try {
        return await resolveConnectionSecret(connection.id);
      } catch {
        return null;
      }
    }
    return null;
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const secret = await resolveSecretForProbe();
      const result = await testConnection(provider, buildConfig(), secret);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  }

  async function handleProbe() {
    setProbing(true);
    setProbeResult(null);
    try {
      const secret = await resolveSecretForProbe();
      const result = await runConnectionProbe(provider, buildConfig(), secret, {
        operation: probeOperation,
        customPath: probeOperation === "custom" ? customPath.trim() : undefined,
        testRecipient: probeOperation === "send-test" ? testRecipient.trim() : undefined,
      });
      setProbeResult(result);
    } finally {
      setProbing(false);
    }
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    try {
      const config = buildConfig();
      if (connection) {
        await updateConnection(connection.id, {
          name: name.trim(),
          config,
          secret: needsSecret && secretTouched && secretValue.trim() ? secretValue.trim() : undefined,
        });
      } else {
        // Solo se exige el vault si de verdad hay un secreto que cifrar — un
        // inbox abierto (secreto opcional vacío) no lo necesita.
        const secretToSave = needsSecret && secretValue.trim() ? secretValue.trim() : undefined;
        if (secretToSave && !useVaultStore.getState().isUnlocked) {
          alert("Desbloquea el vault para guardar credenciales.");
          return;
        }
        await createConnection({
          provider,
          name: name.trim(),
          config,
          secret: secretToSave,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al guardar la conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar conexión — ${meta.label}` : `Nueva conexión — ${meta.label}`}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="conn-name">Nombre</Label>
              <Input
                id="conn-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${meta.label} producción`}
              />
            </div>

            {meta.fields.map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label htmlFor={`conn-${field.key}`}>{field.label}</Label>
                <Input
                  id={`conn-${field.key}`}
                  value={fieldValues[field.key] ?? ""}
                  onChange={(e) =>
                    setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            {needsSecret && (
              <div className="grid gap-2">
                <Label htmlFor="conn-secret">{meta.secretLabel}</Label>
                <Input
                  id="conn-secret"
                  type="password"
                  value={secretValue}
                  onChange={(e) => {
                    setSecretValue(e.target.value);
                    setSecretTouched(true);
                  }}
                  placeholder={meta.secretPlaceholder}
                />
                <p className="text-xs text-muted-foreground">
                  Se cifra localmente con AES-GCM antes de guardarse.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !fieldValues.proxyUrl?.trim()}
              >
                {testing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Probar conexión"
                )}
              </Button>

              {testResult && (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    testResult.ok ? "text-success" : "text-destructive"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <AlertCircle className="size-4" />
                  )}
                  {testResult.detail}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setExplorerOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
              >
                Explorador de conexión
                {explorerOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {explorerOpen && (
                <div className="space-y-3 border-t border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    Elige una operación y ejecútala para ver la respuesta real de la API — útil para
                    saber qué campos existen antes de construir un flujo.
                  </p>

                  <div className="grid gap-2">
                    <Label htmlFor="conn-probe-operation">Operación</Label>
                    <Select
                      id="conn-probe-operation"
                      value={probeOperation}
                      onChange={(e) => setProbeOperation(e.target.value as ProbeOperation)}
                    >
                      {probeOperations.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {provider === "hubspot" && probeOperation === "custom" && (
                    <div className="grid gap-2">
                      <Label htmlFor="conn-probe-custom-path">Ruta (GET)</Label>
                      <Input
                        id="conn-probe-custom-path"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        placeholder="/crm/v3/objects/companies"
                      />
                    </div>
                  )}

                  {provider === "email" && probeOperation === "send-test" && (
                    <div className="grid gap-2">
                      <Label htmlFor="conn-probe-recipient">Destinatario de prueba</Label>
                      <Input
                        id="conn-probe-recipient"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder={fieldValues.fromEmail || "tucorreo@ejemplo.com"}
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleProbe}
                    disabled={
                      probing ||
                      !fieldValues.proxyUrl?.trim() ||
                      (provider === "hubspot" && probeOperation === "custom" && !customPath.trim())
                    }
                  >
                    {probing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        Ejecutar
                      </>
                    )}
                  </Button>

                  {probeResult && (
                    <div className="space-y-2">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          probeResult.ok ? "text-success" : "text-destructive"
                        }`}
                      >
                        {probeResult.ok ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <AlertCircle className="size-4" />
                        )}
                        {probeResult.detail}
                      </div>
                      {probeResult.raw !== undefined && (
                        <div className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Respuesta cruda
                          </p>
                          <pre className="text-xs">
                            <code>{JSON.stringify(probeResult.raw, null, 2)}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || saving}>
            {saving ? "Guardando..." : isEditing ? "Guardar" : "Crear conexión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
