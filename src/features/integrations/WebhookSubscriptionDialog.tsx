import { useEffect, useState } from "react";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  createWebhookSubscription,
  updateWebhookSubscription,
} from "@/integrations/outbound/dispatcher";
import type { WebhookSubscription } from "@/storage/integration-db";
import { EVENT_TRIGGERS, triggerLabel } from "@/domain/labels";
import { WebhookSignatureGuide } from "@/features/flows/canvas/WebhookSignatureGuide";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subscription?: WebhookSubscription;
  onSaved: () => void;
}

function generateSecret(): string {
  return `whsec_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
}

export function WebhookSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [signatureGuideOpen, setSignatureGuideOpen] = useState(false);

  // Spec 034 §B: si la migración no pudo descifrar el secreto (vault bloqueado),
  // la suscripción quedó `needsReconnect` — pedir reingresarlo.
  const needsReconnect = Boolean(subscription?.needsReconnect);

  useEffect(() => {
    if (open) {
      setName(subscription?.name ?? "");
      setUrl(subscription?.url ?? "");
      setEvents(subscription?.events ?? []);
      // Modo Simple por defecto (spec 034 §A): sin secreto = webhook limpio.
      // Al editar, prefill con el secreto en claro guardado; si `needsReconnect`
      // no hay secreto recuperable, arrancar vacío para que se reingrese.
      setSecret(needsReconnect ? "" : subscription?.secret ?? "");
      setCopied(false);
    }
  }, [open, subscription, needsReconnect]);

  // Preset derivado (spec 034 §A): con secreto ⇒ Firmado, sin secreto ⇒ Simple.
  const signed = secret.trim().length > 0;

  async function handleCopySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!name.trim() || !url.trim() || events.length === 0) return;

    // Secreto en claro (spec 034 §B): sin cifrado ni gate de vault. Sin secreto
    // ⇒ webhook limpio sin firma. Guardar siempre limpia `needsReconnect`.
    const secretValue = signed ? secret.trim() : undefined;

    if (subscription) {
      await updateWebhookSubscription(subscription.id, {
        name: name.trim(),
        url: url.trim(),
        events,
        secret: secretValue,
        needsReconnect: false,
      });
      onSaved();
      onOpenChange(false);
      return;
    }

    await createWebhookSubscription({
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      events,
      secret: secretValue,
      needsReconnect: false,
      filters: {},
      enabled: true,
    });

    onSaved();
    onOpenChange(false);
  }

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {subscription ? "Editar suscripción" : "Nueva suscripción de Webhook"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {needsReconnect && (
              <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                El secreto de firma no se pudo recuperar en la migración (el vault estaba bloqueado).
                Reingresá el secreto abajo, o pasá a modo Simple si no necesitás firma.
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="ws-name">Nombre</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Notificar a Slack cuando tarea se complete"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ws-url">URL del Webhook</Label>
              <Input
                id="ws-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Eventos a escuchar</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TRIGGERS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={events.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <span>{triggerLabel[event] ?? event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Formato del envío</Label>
              {/* Preset Simple/Firmado (spec 034 §A/§B): sin secreto = webhook
                  limpio (lo que un Catch Hook espera al primer intento); con
                  secreto = firma HMAC opt-in. */}
              <Select
                value={signed ? "signed" : "simple"}
                onChange={(e) =>
                  setSecret(e.target.value === "simple" ? "" : secret.trim() || generateSecret())
                }
              >
                <option value="simple">Simple — sin firma (recomendado para empezar)</option>
                <option value="signed">Firmado — con secreto HMAC</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {signed
                  ? "Cada entrega se firma con HMAC-SHA256 (header X-Hito-Signature). Pegá el mismo secreto en tu verificador."
                  : "Se envía sin firma. Es lo que un Catch Hook de Make/Zapier espera al conectar por primera vez."}
              </p>
            </div>

            {signed && (
              <div className="grid gap-2">
                <Label>Secret (para verificar firma)</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    placeholder="whsec_..."
                  />
                  <Button variant="outline" size="sm" onClick={() => setSecret(generateSecret())}>
                    Generar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopySecret}>
                    {copied ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este secret firma los payloads con HMAC-SHA256.{" "}
                  <button
                    type="button"
                    onClick={() => setSignatureGuideOpen(true)}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    ¿Cómo verifico esta firma?
                  </button>
                </p>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !url.trim() || events.length === 0}
          >
            {subscription ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <WebhookSignatureGuide open={signatureGuideOpen} onOpenChange={setSignatureGuideOpen} />
    </Dialog>
  );
}
