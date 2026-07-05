/**
 * AiAssistantSection — Detalle técnico del asistente IA de Hito.
 *
 * Esta sección explica los 3 pilares del sistema de IA:
 *
 * 1. MCP (Model Context Protocol) Tools
 *    ────────────────────────────────────
 *    El asistente expone herramientas estandarizadas vía MCP que permiten
 *    al LLM leer y escribir datos del workspace. Las tools se definen con
 *    esquemas Zod y se registran en un registry central (src/ai/tools/).
 *    - Read tools: get_project, list_projects, get_workspace, etc.
 *    - Write tools: create_project, mutate_project, create_task, etc.
 *    - Composite tools: análisis de salud, sugerencias de plantillas.
 *    Las escrituras requieren confirmación del usuario por defecto.
 *
 * 2. RAG (Retrieval-Augmented Generation)
 *    ────────────────────────────────────
 *    Antes de cada consulta, el sistema busca entidades semánticamente
 *    relevantes en el workspace para inyectarlas como contexto en el
 *    system prompt. Esto permite al modelo responder con precisión sobre
 *    proyectos, tareas y personas específicas sin necesidad de enviar
 *    todo el workspace al LLM.
 *
 * 3. Embeddings locales (gemini-embedding-001)
 *    ────────────────────────────────────
 *    Cada entidad (producto, proyecto, tarea, área, checklist, persona,
 *    plantilla, automatización) se indexa generando un vector de embedding
 *    vía la API de Gemini. Los vectores se almacenan en IndexedDB (nunca
 *    en el workspace exportable). La búsqueda usa similitud coseno.
 *    El indexer es incremental: solo re-embedda entidades modificadas.
 *
 * Flujo completo de una consulta:
 *   Usuario → buildRagContext(query) → semanticSearch(embeddings)
 *          → systemPrompt con contexto RAG → agent loop (Gemini)
 *          → tool calls (MCP) → respuesta con datos reales
 */
import { Database, Brain, Shield, ArrowRight, Cpu, Search, Zap } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    tag: "MCP Tools",
    title: "Gestión vía protocolo estándar",
    body: "El asistente usa MCP (Model Context Protocol) para leer y escribir en tu workspace. Cada herramienta tiene un esquema Zod validado: get_project, create_task, mutate_project, y 20+ más. Las escrituras siempre requieren tu confirmación.",
    detail: "Read → Write → Composite",
  },
  {
    icon: Search,
    tag: "RAG",
    title: "Contexto semántico en cada consulta",
    body: "Antes de responder, el sistema busca las entidades más relevantes de tu workspace usando búsqueda vectorial. El contexto se inyecta en el system prompt para que el modelo responda con precisión sobre tus proyectos reales.",
    detail: "Semantic search → Top-K → System prompt",
  },
  {
    icon: Database,
    tag: "Embeddings",
    title: "Vectores locales, nunca en la nube",
    body: "Cada entidad (proyecto, tarea, área, persona, plantilla) se indexa con gemini-embedding-001. Los vectores viven en IndexedDB de tu navegador, no en tu carpeta exportable. El indexer es incremental: solo re-procesa lo que cambió.",
    detail: "gemini-embedding-001 → IndexedDB → Cosine similarity",
  },
];

const FLOW_STEPS = [
  {
    icon: Brain,
    label: "Consulta",
    desc: "Escribís en lenguaje natural: \"¿Qué proyectos están estancados?\"",
  },
  {
    icon: Search,
    label: "RAG Search",
    desc: "Se buscan las entidades más relevantes por similitud semántica.",
  },
  {
    icon: Cpu,
    label: "MCP Tools",
    desc: "El modelo llama herramientas para leer datos reales del workspace.",
  },
  {
    icon: Zap,
    label: "Respuesta",
    desc: "Respuesta accionable con datos actualizados. Puede escribir si se lo pedís.",
  },
];

export function AiAssistantSection() {
  return (
    <section id="asistente-ia" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Asistente IA
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Un PM adjunto que entiende tu workspace.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Gemini gestiona tus proyectos vía MCP tools con contexto RAG generado
            localmente. Tus datos nunca salen de tu equipo para indexarse.
          </p>
        </div>

        {/* 3 pilares: MCP, RAG, Embeddings */}
        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.tag}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-7 transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
                    <Icon className="size-5 transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {p.tag}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
                <p className="mt-auto border-t border-border/60 pt-4 font-mono text-xs text-foreground/70">
                  {p.detail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Flujo de una consulta */}
        <div className="mt-20">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Flujo de una consulta
            </p>
            <h3 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              De la pregunta a la acción en 4 pasos.
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5 transition-all duration-300 hover:border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full border border-primary/30 bg-primary/[0.06] font-mono text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <Icon className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold tracking-tight">{step.label}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight className="hidden lg:absolute lg:-right-3 lg:top-1/2 lg:block lg:size-3 lg:-translate-y-1/2 lg:text-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacidad */}
        <div className="mt-16 flex items-start gap-4 rounded-xl border border-border/60 bg-muted/30 p-6">
          <Shield className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Privacidad por diseño</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              La API key de Gemini se guarda en IndexedDB de tu dispositivo, nunca en el workspace exportable.
              Los embeddings se generan y almacenan localmente. El modelo solo recibe el contexto semántico
              de tu consulta y los datos que las herramientas MCP leen bajo tu supervisión. Podés desactivar
              el RAG o el asistente completo en cualquier momento desde la configuración.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
