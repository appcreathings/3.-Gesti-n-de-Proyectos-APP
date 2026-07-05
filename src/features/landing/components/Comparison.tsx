/**
 * Comparison — Tabla comparativa vs competidores cloud.
 *
 * Compara Hito vs Trello vs Notion vs ClickUp en 6 dimensiones:
 * - Dónde viven tus datos
 * - Funciona 100% offline
 * - Sin cuenta ni registro
 * - Sin límite de usuarios
 * - Formato de datos abierto (.json, versionable con Git)
 * - Gratis, sin planes pagos
 *
 * Celdas: ✓ (verde) = sí, − (gris) = parcial, ✗ (gris claro) = no.
 * Columna Hito destacada con fondo primario sutil.
 *
 * Nota: "Trello, Notion y ClickUp son marcas de sus respectivos dueños."
 */
import { Check, X, Minus } from "lucide-react";

type Cell = true | false | "partial";

const COMPETITORS = ["Hito", "Trello", "Notion", "ClickUp"] as const;

const ROWS: { label: string; values: [Cell, Cell, Cell, Cell] }[] = [
  {
    label: "Dónde viven tus datos",
    values: [true, false, false, false],
  },
  {
    label: "Funciona 100% offline",
    values: [true, "partial", "partial", false],
  },
  {
    label: "Sin cuenta ni registro",
    values: [true, false, false, false],
  },
  {
    label: "Sin límite de usuarios",
    values: [true, "partial", "partial", "partial"],
  },
  {
    label: "Formato de datos abierto (.json, versionable con Git)",
    values: [true, false, false, false],
  },
  {
    label: "Gratis, sin planes pagos",
    values: [true, "partial", "partial", "partial"],
  },
];

function Cell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <Check className="size-4 text-success" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="flex items-center justify-center">
        <Minus className="size-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <X className="size-4 text-muted-foreground/40" />
    </div>
  );
}

export function Comparison() {
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Comparativa
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Las mismas tareas. Sin entregar tus datos.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Trello, Notion y ClickUp son excelentes herramientas — que guardan
            tu información en sus servidores. Esto es lo que cambia con Hito.
          </p>
        </div>

        <div className="mx-auto max-w-4xl overflow-x-auto rounded-2xl border border-border/60 bg-background">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="p-4 text-left font-medium text-muted-foreground">
                  &nbsp;
                </th>
                {COMPETITORS.map((name, i) => (
                  <th
                    key={name}
                    className={`p-4 text-center font-semibold tracking-tight ${
                      i === 0
                        ? "bg-primary/[0.06] text-primary"
                        : "text-foreground/70"
                    }`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                  <td className="p-4 text-left text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={i === 0 ? "bg-primary/[0.06]" : ""}
                    >
                      <Cell value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-6 max-w-4xl text-center text-xs text-muted-foreground/70">
          Comparación basada en los planes gratuitos/estándar de cada herramienta al momento
          de escribir esto. Trello, Notion y ClickUp son marcas de sus respectivos dueños.
          {" "}
          <a
            href="/alternativa-trello"
            className="text-foreground/80 underline-offset-2 hover:underline"
          >
            Comparativa detallada con Trello →
          </a>
        </p>
      </div>
    </section>
  );
}
