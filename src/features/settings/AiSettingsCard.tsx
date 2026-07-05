import { useState } from "react";
import { Check, Eye, EyeOff, ExternalLink, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AI_MODELS, type AiConfig } from "@/ai/config";
import { AI_ERROR_MESSAGES } from "@/ai/gemini/errors";
import { useAiConfigStore, type KeyStatus } from "@/store/useAiConfigStore";

/** Google AI Studio (Gemini) configuration — key lives only on this device. */
export function AiSettingsCard() {
  const config = useAiConfigStore((s) => s.config);
  const keyStatus = useAiConfigStore((s) => s.keyStatus);
  const lastError = useAiConfigStore((s) => s.lastError);
  const saveAndValidateKey = useAiConfigStore((s) => s.saveAndValidateKey);
  const clearKey = useAiConfigStore((s) => s.clearKey);
  const setModel = useAiConfigStore((s) => s.setModel);
  const setConfirmWrites = useAiConfigStore((s) => s.setConfirmWrites);

  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);

  const hasKey = keyStatus === "valid";

  async function onSave() {
    const ok = await saveAndValidateKey(draft);
    if (ok) setDraft("");
  }

  return (
    <Card id="ia" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Asistente IA (Gemini)
        </CardTitle>
        <CardDescription>
          Conecta una API key de Google AI Studio para chatear con tus datos. La clave se
          guarda <strong>solo en este dispositivo</strong> (IndexedDB); nunca se incluye en{" "}
          <code>workspace.json</code> ni en las exportaciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid max-w-xl gap-5">
        {/* Estado + input de la key */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-key">API key</Label>
            <StatusBadge status={keyStatus} />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="ai-key"
                type={show ? "text" : "password"}
                value={draft}
                placeholder={hasKey ? "••••••••  (clave guardada)" : "AIza…"}
                autoComplete="off"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) void onSave();
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Ocultar clave" : "Mostrar clave"}
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              onClick={onSave}
              disabled={!draft.trim() || keyStatus === "validating"}
            >
              {keyStatus === "validating" ? "Validando…" : "Validar y guardar"}
            </Button>
          </div>
          {(keyStatus === "invalid" || keyStatus === "network-error") && lastError && (
            <p role="alert" className="text-xs text-destructive">
              {AI_ERROR_MESSAGES[lastError]}
            </p>
          )}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Obtener una API key gratuita en Google AI Studio
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Modelo */}
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="ai-model">Modelo</Label>
          <Select
            id="ai-model"
            value={config.model}
            onChange={(e) => setModel(e.target.value as AiConfig["model"])}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.hint}
              </option>
            ))}
          </Select>
        </div>

        {/* Confirmación de escrituras */}
        <label className="flex items-start gap-3">
          <Checkbox
            checked={config.confirmWrites}
            onCheckedChange={(v) => setConfirmWrites(v)}
            aria-label="Confirmar antes de escribir datos"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Confirmar antes de escribir datos</span>
            <span className="text-xs text-muted-foreground">
              El asistente pedirá tu aprobación en el chat antes de crear o modificar
              proyectos, tareas o checklists. Recomendado.
            </span>
          </span>
        </label>

        {hasKey && (
          <div>
            <Button variant="outline" size="sm" onClick={() => clearKey()}>
              <Trash2 className="size-4" />
              Borrar clave de este dispositivo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: KeyStatus }) {
  switch (status) {
    case "valid":
      return (
        <Badge variant="success" className="gap-1">
          <Check className="size-3" /> Válida
        </Badge>
      );
    case "invalid":
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="size-3" /> Inválida
        </Badge>
      );
    case "network-error":
      return <Badge variant="warning">Error de red</Badge>;
    case "validating":
      return <Badge variant="secondary">Validando…</Badge>;
    default:
      return <Badge variant="outline">Sin configurar</Badge>;
  }
}
