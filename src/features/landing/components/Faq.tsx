/**
 * Faq — Acordeón de preguntas frecuentes con animación de expansión.
 *
 * Usa un estado controlado (openIndex) para permitir solo una pregunta
 * abierta a la vez. Las respuestas se animan con grid-template-rows.
 *
 * Las mismas preguntas se duplican en el JSON-LD de LandingPage.tsx
 * para habilitar rich snippets de FAQ en Google.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "¿Mis datos están seguros en Hito?",
    a: "Sí. Hito es local-first: tus datos nunca se envían a ningún servidor. Viven en archivos .json dentro de una carpeta que vos elegís en tu equipo. No hay backend, no hay nube, no hay terceros con acceso. Incluso si usás la PWA offline, los datos se guardan localmente.",
  },
  {
    q: "¿Puedo compartir la carpeta con mi equipo?",
    a: "Sí. Como los datos son archivos .json en una carpeta local, podés compartirla por red, Dropbox, Google Drive, Git o cualquier medio que ya uses. Cada persona abre la misma carpeta desde su Hito. No hay límite de usuarios simultáneos.",
  },
  {
    q: "¿Hito funciona sin internet?",
    a: "Sí. Hito es una PWA (Progressive Web App) que funciona completamente offline. Una vez instalada, podés gestionar proyectos, procesos y tareas sin conexión. Los datos se sincronizan cuando volvés a estar online si compartís la carpeta por un servicio en la nube.",
  },
  {
    q: "¿Hito es realmente gratis?",
    a: "Sí, 100% gratuito y open source bajo licencia MIT. No hay planes pagos, ni suscripciones, ni límites ocultos. Podés usarlo para proyectos personales, profesionales o comerciales sin restricciones. El código es público y podés auditarlo, modificarlo o redistribuirlo.",
  },
  {
    q: "¿Qué diferencia a Hito de Trello, Notion o ClickUp?",
    a: "La diferencia fundamental es la privacidad y el control de datos. Trello, Notion y ClickUp guardan tus datos en sus servidores. Hito es local-first: tus datos viven en tu equipo, son archivos .json legibles y versionables con Git. No necesitás cuenta, no hay límite de usuarios, funcionás offline, y si mañana querés migrar, tus datos ya están en un formato estándar.",
  },
  {
    q: "¿Cómo funciona el asistente de IA sin comprometer mi privacidad?",
    a: "El asistente usa Gemini (de Google) para entender tus preguntas y gestionar proyectos, pero con arquitectura MCP + RAG local. Tu API key se guarda en IndexedDB de tu navegador, nunca en el workspace exportable. Los embeddings se generan y almacenan localmente. El modelo solo recibe el contexto semántico de tu consulta específica, no todo tu workspace. Podés desactivar el asistente o el RAG en cualquier momento desde la configuración.",
  },
  {
    q: "¿Qué es MCP y cómo lo usa el asistente?",
    a: "MCP (Model Context Protocol) es un estándar para que modelos de IA interactúen con herramientas externas. En Hito, el asistente expone +20 herramientas MCP (get_project, create_task, mutate_project, etc.) con esquemas Zod validados. Esto permite al modelo leer y escribir datos reales de tu workspace de forma controlada. Las escrituras siempre requieren tu confirmación explícita.",
  },
  {
    q: "¿Qué pasa si pierdo la carpeta donde tengo los datos?",
    a: "Como los datos son archivos .json comunes, deberías incluir la carpeta en tu sistema de backups habitual. Podés usar Git para versionarlos, Dropbox/Google Drive para tener copia en la nube, o simplemente copiar la carpeta a un disco externo. Hito también permite exportar toda la base de datos como un archivo .zip.",
  },
  {
    q: "¿Qué formato tienen los datos? ¿Puedo leerlos con otra herramienta?",
    a: "Cada proyecto y producto es un archivo .json con una estructura clara y validada con esquemas Zod. Podés abrirlos con cualquier editor de texto, procesarlos con scripts, o versionarlos con Git. No hay bases de datos binarias ni formatos propietarios.",
  },
  {
    q: "¿Necesito crear una cuenta o registrarme?",
    a: "No. Hito no tiene sistema de cuentas. Abrís la app, elegís una carpeta en tu equipo, y empezás a trabajar. No pedimos email, nombre ni ningún dato personal. Tu identidad es la carpeta que elegís.",
  },
];

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium transition-colors hover:text-foreground/80"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
          open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        }`}
      >
        <p className="min-h-0 text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Todo lo que necesitás saber antes de probar Hito.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {FAQS.map((faq, i) => (
            <FaqItem
              key={i}
              question={faq.q}
              answer={faq.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
