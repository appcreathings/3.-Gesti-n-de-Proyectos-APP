import type { Trigger, FlowRule } from "@/domain/schemas/flow";
import { TriggerStep } from "../steps/TriggerStep";
import { createEmptyFlow } from "@/flows/migration";

interface Props {
  trigger: Trigger;
  onChange: (trigger: Trigger) => void;
  /** Reenvía la muestra real que trajo "Probar conexión" hacia el canvas
   * (spec 022 §A) — ver `TriggerStep`'s `onSampleChange`. */
  onSampleChange?: (sample: Record<string, unknown>[] | undefined) => void;
}

/** Adapta `TriggerStep` (que históricamente opera sobre un `FlowRule`
 * completo) para editar solo el nodo trigger del canvas, reutilizando toda
 * su lógica existente: selector de evento, conexión de HubSpot, filtros,
 * campos y "probar conexión". El resto del `FlowRule` sintético nunca se lee. */
export function TriggerNodeDrawer({ trigger, onChange, onSampleChange }: Props) {
  const syntheticFlow: FlowRule = { ...createEmptyFlow(""), trigger };
  return (
    <TriggerStep
      flow={syntheticFlow}
      updateFlow={(updates) => {
        if (updates.trigger) onChange(updates.trigger);
      }}
      onSampleChange={onSampleChange}
    />
  );
}
