import type { Trigger, FlowRule } from "@/domain/schemas/flow";
import { TriggerStep } from "../steps/TriggerStep";
import { createEmptyFlow } from "@/flows/migration";

interface Props {
  trigger: Trigger;
  onChange: (trigger: Trigger) => void;
  /** Reenvía la muestra real que trajo "Probar conexión" hacia el canvas
   * (spec 022 §A) — ver `TriggerStep`'s `onSampleChange`. */
  onSampleChange?: (sample: Record<string, unknown>[] | undefined) => void;
  /** Muestra vigente (efímera del canvas o persistida en `flow.lastSample`)
   * para que `TriggerStep` muestre el `SampleExplorer` y el badge con la
   * cuenta. El `syntheticFlow` construido aquí no lleva `lastSample`, así
   * que hay que pasarlo por separado. Spec 025 §A (ext). */
  sample?: Record<string, unknown>[];
  /** Registro elegido para las vistas previas en vivo (spec 026 §D3). */
  previewRecordIndex?: number;
  onPreviewRecordIndexChange?: (index: number) => void;
}

/** Adapta `TriggerStep` (que históricamente opera sobre un `FlowRule`
 * completo) para editar solo el nodo trigger del canvas, reutilizando toda
 * su lógica existente: selector de evento, conexión de HubSpot, filtros,
 * campos y "probar conexión". El resto del `FlowRule` sintético nunca se lee. */
export function TriggerNodeDrawer({
  trigger,
  onChange,
  onSampleChange,
  sample,
  previewRecordIndex,
  onPreviewRecordIndexChange,
}: Props) {
  const syntheticFlow: FlowRule = { ...createEmptyFlow(""), trigger };
  return (
    <TriggerStep
      flow={syntheticFlow}
      updateFlow={(updates) => {
        if (updates.trigger) onChange(updates.trigger);
      }}
      onSampleChange={onSampleChange}
      sample={sample}
      previewRecordIndex={previewRecordIndex}
      onPreviewRecordIndexChange={onPreviewRecordIndexChange}
    />
  );
}
