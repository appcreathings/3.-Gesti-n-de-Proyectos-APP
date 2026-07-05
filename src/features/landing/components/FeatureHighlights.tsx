import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanSquare, Workflow, Sparkles, HardDriveDownload } from "lucide-react";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Kanban con arrastrar y soltar",
    description: "Tareas por estado, reordenables dentro de cada columna, con foco por área.",
  },
  {
    icon: Workflow,
    title: "Automatizaciones",
    description:
      "Reglas de trigger→condición→acción para cambios de estado, plantillas y recordatorios.",
  },
  {
    icon: Sparkles,
    title: "Asistente IA integrado",
    description:
      "Conversa con Gemini sobre tus proyectos: estado, riesgos, tareas bloqueadas y más.",
  },
  {
    icon: HardDriveDownload,
    title: "Instalable como app",
    description: "Funciona offline y se instala en tu escritorio como cualquier aplicación.",
  },
];

export function FeatureHighlights() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Todo lo que necesitas para operar</h2>
        <p className="mt-2 text-muted-foreground">
          Productos, proyectos, procesos (SOPs), checklists y tareas, en un solo lugar.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
