import { HierarchyLegend } from "@/components/HierarchyLegend";

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>
        <p className="mt-2 text-muted-foreground">
          Todo se organiza en una jerarquía simple, de lo general a lo accionable.
        </p>
      </div>
      <HierarchyLegend />
    </section>
  );
}
