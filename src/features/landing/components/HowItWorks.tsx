/**
 * HowItWorks — 4 pasos para empezar + explicación de jerarquía.
 *
 * Sección dividida en 2 partes:
 * 1. Grid de 4 pasos: Elegí carpeta → Creá producto → Definí procesos → Gestioná tareas
 *    Cada paso tiene: número, icono, label y descripción corta.
 *    Flechas conectoras entre pasos en desktop.
 *
 * 2. Jerarquía de entidades con HierarchyLegend:
 *    Producto → Proyecto → Área → Proceso/Checklist → Tarea
 *    Layout 2 columnas: texto explicativo + componente visual.
 */
import { FolderOpen, Package, FileText, ListChecks, ArrowRight } from "lucide-react";
import { HierarchyLegend } from "@/components/HierarchyLegend";

const STEPS = [
  { icon: FolderOpen, label: "Elegí tu carpeta", desc: "Sin registro. Sin cuentas. Elegís una carpeta local y Hito crea tu espacio de trabajo." },
  { icon: Package, label: "Creá un Producto", desc: "Agrupá proyectos bajo un mismo paraguas. Cada producto tiene su visión y objetivos." },
  { icon: FileText, label: "Definí procesos", desc: "Documentá SOPs y checklists por área de proyecto. Todo reusable con plantillas." },
  { icon: ListChecks, label: "Gestioná tareas", desc: "Kanban arrastrable, automatizaciones, y un dashboard que te muestra la salud de todo." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 max-w-2xl sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Cómo funciona
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            De decidir a ejecutar en 4 pasos.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Sin onboarding eterno. Sin formularios. Elegís una carpeta y ya
            estás operando.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-6 transition-colors duration-300 hover:border-primary/30">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Paso {i + 1}
                </span>
                <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50 transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
                  <Icon className="size-5 transition-colors duration-300 group-hover:text-primary" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">{s.label}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:absolute lg:-right-4 lg:top-1/2 lg:block lg:size-4 lg:-translate-y-1/2 lg:text-border" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <h3 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                Una jerarquía clara, de lo general a lo accionable.
              </h3>
              <p className="mt-4 max-w-md text-pretty text-muted-foreground">
                Producto → Proyecto → Área → Proceso / Checklist → Tarea. Todo
                es un archivo .json. Nada se esconde.
              </p>
            </div>
            <div>
              <HierarchyLegend />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
