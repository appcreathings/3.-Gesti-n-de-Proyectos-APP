import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlowRule } from "@/domain/schemas/flow";
import { createEmptyFlow } from "@/flows/migration";
import {
  buildGraphFromRule,
  compileGraphToRule,
  graphFromPersisted,
  type BuiltGraph,
} from "@/flows/graph";
import { FlowCanvas } from "./canvas/FlowCanvas";
import { useFlowStore } from "@/store/useFlowStore";
import { ROUTES } from "@/routes/paths";

export function FlowBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const addFlow = useFlowStore((s) => s.addFlow);
  const updateFlowInStore = useFlowStore((s) => s.updateFlow);
  const flows = useFlowStore((s) => s.flows);
  const flowsHydrated = useFlowStore((s) => s.hydrated);
  const isEditing = Boolean(id);

  const [flow, setFlow] = useState<FlowRule>(createEmptyFlow("Nuevo flujo"));
  const [graph, setGraph] = useState<BuiltGraph>(() => buildGraphFromRule(flow));
  // Distinto de `flow.id`: solo se fija una vez que el flow existente termina
  // de cargar desde el store (async). Se usa como `key` del canvas para
  // forzar un único remount con el grafo correcto en modo edición — el
  // canvas solo siembra su estado interno desde `initialGraph` en el primer
  // render, así que si el flow llega después del primer render (típico:
  // `useFlowStore` hidrata de forma asíncrona) el canvas debe re-montarse.
  const [loadedFlowId, setLoadedFlowId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || loadedFlowId === id) return;
    const existing = flows.find((f) => f.id === id);
    if (!existing) return;
    setFlow(existing);
    setGraph(existing.graph ? graphFromPersisted(existing.graph) : buildGraphFromRule(existing));
    setLoadedFlowId(existing.id);
  }, [id, flows, loadedFlowId]);

  const handleSave = async () => {
    const compiled = compileGraphToRule(graph);
    if (!compiled.trigger) return;

    const finalFlow: FlowRule = {
      ...flow,
      trigger: compiled.trigger,
      logic: {
        conditions: compiled.conditions,
        mapping: compiled.mapping,
        transformCode: compiled.transformCode,
      },
      outputs: compiled.outputs,
      graph: graph as unknown as FlowRule["graph"],
      updatedAt: new Date().toISOString(),
    };

    if (isEditing) {
      await updateFlowInStore(finalFlow);
    } else {
      await addFlow(finalFlow);
    }
    navigate(ROUTES.flows);
  };

  if (isEditing && flowsHydrated && !flows.some((f) => f.id === id)) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Flujo no encontrado"
        description="Puede que haya sido eliminado."
        action={<Button onClick={() => navigate(ROUTES.flows)}>Volver a flujos</Button>}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditing ? "Editar Flujo" : "Nuevo Flujo"} | Hito</title>
        <meta name="description" content="Construye un flujo automatizado arrastrando nodos: trigger, condiciones, transformación y acciones." />
      </Helmet>

      <div>
        <PageHeader
          label="Flujos"
          title={isEditing ? "Editar Flujo" : "Nuevo Flujo"}
          description="Arrastra los nodos para reordenarlos visualmente; el pipeline de ejecución (trigger → condiciones → transformación → acciones) es fijo — no se conectan aristas a mano."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(ROUTES.flows)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Zap className="size-4" />
                {isEditing ? "Guardar Cambios" : "Guardar Flujo"}
              </Button>
            </div>
          }
        />

        <div className="mb-4 max-w-md">
          <Input
            value={flow.name}
            onChange={(e) => setFlow((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del flujo"
            className="text-base font-medium"
          />
        </div>

        <FlowCanvas key={loadedFlowId ?? "new"} initialGraph={graph} onGraphChange={setGraph} />
      </div>
    </>
  );
}
