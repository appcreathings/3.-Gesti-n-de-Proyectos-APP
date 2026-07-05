import { FolderTree, Lock, FileCode2 } from "lucide-react";

const STATS = [
  {
    icon: Lock,
    value: "0 KB",
    label: "enviados a la nube",
    description:
      "Tus datos viven en una carpeta local. No hay backend procesándolos.",
  },
  {
    icon: FileCode2,
    value: ".json",
    label: "no cajas negras",
    description:
      "Cada proyecto es un archivo legible. Versionable con git, editable con cualquier herramienta.",
  },
  {
    icon: FolderTree,
    value: "1 carpeta",
    label: "para todo tu equipo",
    description:
      "Compartila por la red, por Dropbox, por Git, como prefieras. Sale del laboratorio, queda en tu casa.",
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Privacidad por defecto
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Local-first no es un añadido. Es la arquitectura.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            La mayoría de las herramientas te piden sus datos para funcionar.
            Hito funciona con los tuyos.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border sm:grid-cols-3">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex flex-col gap-3 bg-background p-8"
              >
                <Icon className="size-5 text-muted-foreground" />
                <div className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
                  {s.value}
                </div>
                <div className="text-sm font-medium">{s.label}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
