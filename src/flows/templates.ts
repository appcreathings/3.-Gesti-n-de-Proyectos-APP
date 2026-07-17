import type { FlowRule } from "@/domain/schemas/flow";
import { createEmptyFlow } from "./migration";
import { HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE } from "@/features/flows/canvas/variables";

/**
 * Galería de plantillas curadas (spec 027 §C, cierra 024 §F8) — plantillas
 * como DATOS, no código: cada `build()` produce un `FlowRule` completo con
 * placeholders vacíos donde va lo que solo el usuario puede decidir
 * (conexión, proyecto destino). Siempre `enabled: false`: la validación de
 * spec 027 §A señala en el builder exactamente qué falta completar antes de
 * activar.
 *
 * Los `{{tokens}}` y `dedupeKey`s ya vienen bien puestos: una plantilla
 * completada (conexión + proyecto) debe funcionar sin editar nada más.
 * `templates.test.ts` las valida contra `FlowRuleSchema` para que no se
 * pudran en silencio cuando el schema evolucione.
 */
export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: "CRM" | "Hojas de cálculo" | "Interno" | "Notificaciones";
  requires: ("hubspot" | "google-sheets" | "email")[];
  build: () => FlowRule;
}

const POLL_INTERVAL_MS = 300_000;

function baseFlow(name: string): FlowRule {
  const flow = createEmptyFlow(name);
  flow.enabled = false;
  return flow;
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "hubspot-deal-to-project",
    name: "Deal de HubSpot → proyecto con tarea de kickoff",
    description:
      "Por cada deal nuevo crea un proyecto (deduplicado por el id del deal) y una tarea de kickoff dentro de ese proyecto.",
    category: "CRM",
    requires: ["hubspot"],
    build: () => ({
      ...baseFlow("Deal de HubSpot → proyecto + kickoff"),
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: {
          connectionId: "",
          objectType: "deals",
          fields: [...HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE.deals],
          filters: [],
          intervalMs: POLL_INTERVAL_MS,
        },
      },
      outputs: [
        {
          type: "createProject",
          name: "{{dealname}}",
          fields: [],
          dedupeKey: "{{id}}",
        },
        {
          type: "createTask",
          title: "Kickoff: {{dealname}}",
          projectRef: "createdProject",
          priority: "high",
          dueDate: "{{closedate}}",
          dedupeKey: "kickoff-{{id}}",
        },
      ],
    }),
  },
  {
    id: "sheets-row-to-task",
    name: "Fila nueva de Sheets → tarea",
    description:
      "Cada fila nueva de la hoja se convierte en una tarea del proyecto que elijas. Ajusta {{Tarea}} al nombre real de tu columna; si la hoja tiene una columna ID, sirve para deduplicar.",
    category: "Hojas de cálculo",
    requires: ["google-sheets"],
    build: () => ({
      ...baseFlow("Fila nueva de Sheets → tarea"),
      trigger: {
        type: "poll",
        provider: "google-sheets",
        config: { connectionId: "", fields: [], filters: [], intervalMs: POLL_INTERVAL_MS },
      },
      outputs: [
        {
          type: "createTask",
          title: "{{Tarea||Nueva fila de Sheets}}",
          projectRef: "explicit",
          priority: "medium",
          dedupeKey: "{{ID||}}",
        },
      ],
    }),
  },
  {
    id: "hubspot-contact-to-person",
    name: "Contacto de HubSpot → persona",
    description:
      "Sincroniza contactos nuevos como Personas de Hito, con match por email para no duplicar.",
    category: "CRM",
    requires: ["hubspot"],
    build: () => ({
      ...baseFlow("Contacto de HubSpot → persona"),
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: {
          connectionId: "",
          objectType: "contacts",
          fields: [...HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE.contacts],
          filters: [],
          intervalMs: POLL_INTERVAL_MS,
        },
      },
      outputs: [
        {
          type: "createPerson",
          matchField: "email",
          matchSource: "{{email}}",
          ifNotFound: "create",
          data: {
            name: "{{firstname}} {{lastname}}",
            email: "{{email}}",
            roleTitle: "{{company||}}",
          },
        },
      ],
    }),
  },
  {
    id: "task-done-email",
    name: "Tarea completada → email de aviso",
    description:
      'Cuando una tarea pasa a "Terminada", envía un email de aviso al destinatario que definas.',
    category: "Notificaciones",
    requires: ["email"],
    build: () => ({
      ...baseFlow("Tarea completada → email de aviso"),
      trigger: { type: "event", event: "task.statusChanged" },
      logic: {
        conditions: [{ field: "to", op: "==", value: "done" }],
        mapping: [],
      },
      outputs: [
        {
          type: "email",
          connectionId: "",
          to: "",
          subject: "Tarea completada en Hito",
          body: "Una tarea del proyecto {{projectId}} pasó a estado {{to}}.",
        },
      ],
    }),
  },
  {
    id: "project-created-webhook",
    name: "Proyecto creado → webhook",
    description:
      "Notifica a un sistema externo (Zapier, Make, tu API) cada vez que se crea un proyecto, con payload firmado.",
    category: "Interno",
    requires: [],
    build: () => ({
      ...baseFlow("Proyecto creado → webhook"),
      trigger: { type: "event", event: "project.created" },
      outputs: [
        {
          type: "webhook",
          url: "",
          secret: "",
          payload: {
            evento: "proyecto.creado",
            proyectoId: "{{projectId}}",
            tipoId: "{{typeId||sin tipo}}",
          },
        },
      ],
    }),
  },
  {
    id: "big-deal-notification",
    name: "Deal grande → notificación",
    description:
      "Aviso interno cuando entra un deal por encima de 10.000 — ajusta el umbral en la condición.",
    category: "CRM",
    requires: ["hubspot"],
    build: () => ({
      ...baseFlow("Deal grande → notificación"),
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: {
          connectionId: "",
          objectType: "deals",
          fields: [...HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE.deals],
          filters: [],
          intervalMs: POLL_INTERVAL_MS,
        },
      },
      logic: {
        conditions: [{ field: "amount", op: ">", value: 10000 }],
        mapping: [],
      },
      outputs: [
        {
          type: "createNotification",
          severity: "info",
          message: "Deal grande: {{dealname}} por {{amount|number:0}}",
        },
      ],
    }),
  },
];

/** Las 3 plantillas destacadas del estado vacío (spec 027 §C) — las de mayor
 * time-to-value. */
export const FEATURED_TEMPLATE_IDS = [
  "hubspot-deal-to-project",
  "sheets-row-to-task",
  "task-done-email",
] as const;

export function featuredTemplates(): FlowTemplate[] {
  return FEATURED_TEMPLATE_IDS.map((id) => FLOW_TEMPLATES.find((t) => t.id === id)!).filter(Boolean);
}
