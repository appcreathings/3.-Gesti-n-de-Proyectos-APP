import { HierarchyLegend } from "@/components/HierarchyLegend";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cómo funciona
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Una jerarquía clara, de lo general a lo accionable.
            </h2>
            <p className="mt-4 max-w-md text-pretty text-muted-foreground">
              Empezás con un Producto, bajás a Proyectos, áreas dentro de
              ellos, y llegás a tareas que se mueven en un Kanban. Nada se
              esconde: todo es un archivo.
            </p>
          </div>
          <div>
            <HierarchyLegend />
          </div>
        </div>
      </div>
    </section>
  );
}
