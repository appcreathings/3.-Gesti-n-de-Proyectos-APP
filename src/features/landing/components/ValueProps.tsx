import { ShieldCheck, FolderCog, FileJson } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Tus datos nunca salen de tu equipo",
    description:
      "Sin backend ni cuenta: todo se guarda en una carpeta local que tú eliges. Nadie más tiene acceso.",
  },
  {
    icon: FolderCog,
    title: "Archivos .json, no una caja negra",
    description:
      "Tus proyectos son archivos legibles que puedes versionar con git, respaldar o editar con cualquier herramienta.",
  },
  {
    icon: FileJson,
    title: "Exporta e importa cuando quieras",
    description:
      "Sin candados: descarga un respaldo completo o cambia de equipo sin perder nada.",
  },
];

export function ValueProps() {
  return (
    <section className="border-y bg-muted/30 py-16">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="text-center sm:text-left">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mx-0">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
