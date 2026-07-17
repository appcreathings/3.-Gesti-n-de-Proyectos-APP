import { useEffect, useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useVaultStore } from "@/integrations/vault";
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

  useEffect(() => {
    if (open) {
      setName(subscription?.name ?? "");
      setUrl(subscription?.url ?? "");
      setEvents(subscription?.events ?? []);
      setSecret(subscription ? "••••••••••••" : generateSecret());
    }
  }, [open, subscription]);

  function generateSecret(): string {
    return `whsec_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  }

  async function handleCopySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!name.trim() || !url.trim() || events.length === 0) return;

    if (subscription) {
      // El campo "secret" se muestra enmascarado y es de solo lectura al
      // editar (no hay forma de regenerarlo desde este diálogo todavía).
      // Nunca reescribir `encryptedSecret`: hacerlo cifraría la máscara
      // literal y rompería la verificación de firma en el receptor.
      await updateWebhookSubscription(subscription.id, {
        name: name.trim(),
        url: url.trim(),
        events,
      });
      onSaved();
      onOpenChange(false);
      return;
    }

    const isUnlocked = useVaultStore.getState().isUnlocked;
    if (!isUnlocked) {
      alert("Desbloquea el vault para guardar credenciales");
      return;
    }

    const encryptedSecret = await useVaultStore.getState().encrypt(secret);
    await createWebhookSubscription({
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      events,
      encryptedSecret,
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
              <Label>Secret (para verificar firma)</Label>
              <div className="flex gap-2">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={handleCopySecret}>
                  {copied ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este secret se usa para firmar los payloads con HMAC-SHA256.{" "}
                <button
                  type="button"
                  onClick={() => setSignatureGuideOpen(true)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  ¿Cómo verifico esta firma?
                </button>
              </p>
            </div>
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
