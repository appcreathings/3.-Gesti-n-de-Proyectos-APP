import type { Project } from "@/domain/schemas";
import type { FlowRule, Output } from "@/domain/schemas/flow";
import {
  deriveAvailableVariables,
  validateVariables,
} from "@/features/flows/canvas/variables";

/**
 * Validador único de configuración de flujos (spec 027 §A) — lo consumen el
 * builder (banner de issues), la lista (badge por tarjeta) y el guard de
 * activación. Puro y barato: se puede computar en render.
 *
 * Criterio de severidad: "error" = el flujo no puede ejecutarse correctamente
 * (poll sin conexión, webhook sin URL...); "warning" = puede ejecutarse pero
 * probablemente no haga lo que el usuario espera (token huérfano, webhook sin
 * secret). Los warnings nunca bloquean nada — mismo criterio que spec 025 §B.
 * Ante la duda (ej. proyecto archivado), el check se mantiene conservador.
 */
export interface FlowIssue {
  severity: "error" | "warning";
  nodeKind: "trigger" | "condition" | "transform" | "action" | "flow";
  /** Índice del nodo dentro de su tipo — outputs para acciones, condiciones
   * para `nodeKind: "condition"` — para abrir el drawer correcto al clicar. */
  outputIndex?: number;
  /** Español natural, accionable. */
  message: string;
}

export interface ValidateFlowDeps {
  projects: Project[];
}

/** Etiqueta corta del output para los mensajes ("Acción 2 (Webhook): ..."). */
function outputLabel(output: Output): string {
  switch (output.type) {
    case "createTask":
      return "Crear Tarea";
    case "createProject":
      return "Crear Proyecto";
    case "createPerson":
      return "Crear Persona";
    case "setProjectStatus":
      return "Cambiar Estado Proyecto";
    case "setField":
      return "Cambiar Campo";
    case "createNotification":
      return "Crear Notificación";
    case "markAreaComplete":
      return "Completar Área";
    case "webhook":
      return "Webhook";
    case "email":
      return "Email";
  }
}

/** Templates interpolables de un output — para el check de tokens huérfanos
 * contra la muestra persistida (solo strings que el motor interpola). */
function outputTemplates(output: Output): string[] {
  switch (output.type) {
    case "createTask":
      return [
        output.title,
        output.description ?? "",
        output.summary ?? "",
        output.assigneeId ?? "",
        output.dueDate ?? "",
        output.dedupeKey ?? "",
        ...(output.tags ?? []),
      ];
    case "createProject":
      return [output.name, output.dedupeKey ?? "", ...output.fields.map((f) => f.source)];
    case "createPerson":
      return [output.matchSource ?? "", ...Object.values(output.data)];
    case "setField":
      return typeof output.value === "string" ? [output.value] : [];
    case "createNotification":
      return [output.message];
    case "webhook":
      return output.payload ? collectStrings(output.payload) : [];
    case "email":
      return [output.to, output.subject, output.body];
    case "setProjectStatus":
    case "markAreaComplete":
      return [];
  }
}

function collectStrings(obj: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const v of Object.values(obj)) {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...collectStrings(v as Record<string, unknown>));
    }
  }
  return out;
}

export function validateFlow(flow: FlowRule, deps: ValidateFlowDeps): FlowIssue[] {
  const issues: FlowIssue[] = [];

  // ── Trigger ────────────────────────────────────────────────────────────
  if (flow.trigger.type === "poll" && !flow.trigger.config.connectionId) {
    const provider = flow.trigger.provider === "hubspot" ? "HubSpot" : "Google Sheets";
    issues.push({
      severity: "error",
      nodeKind: "trigger",
      message: `El trigger de polling no tiene conexión — elige una conexión de ${provider}.`,
    });
  }

  // ── Flujo sin acciones ─────────────────────────────────────────────────
  if (flow.outputs.length === 0) {
    issues.push({
      severity: "error",
      nodeKind: "flow",
      message: "El flujo no tiene acciones — no hará nada al ejecutarse.",
    });
  }

  // ── Condiciones ────────────────────────────────────────────────────────
  flow.logic.conditions.forEach((condition, i) => {
    if (!condition.field.trim()) {
      issues.push({
        severity: "warning",
        nodeKind: "condition",
        outputIndex: i,
        message: `La condición ${i + 1} no tiene campo configurado — no filtra nada.`,
      });
    }
  });

  // ── Outputs ────────────────────────────────────────────────────────────
  const projectIds = new Set(deps.projects.map((p) => p.id));

  flow.outputs.forEach((output, i) => {
    const label = `Acción ${i + 1} (${outputLabel(output)})`;

    switch (output.type) {
      case "webhook": {
        if (!output.url.trim()) {
          issues.push({
            severity: "error",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: falta la URL del webhook.`,
          });
        } else {
          try {
            new URL(output.url);
          } catch {
            issues.push({
              severity: "error",
              nodeKind: "action",
              outputIndex: i,
              message: `${label}: la URL "${output.url}" no es válida.`,
            });
          }
        }
        if (!output.secret.trim()) {
          issues.push({
            severity: "warning",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: sin secret — el receptor no podrá verificar la firma HMAC.`,
          });
        }
        break;
      }

      case "email": {
        if (!output.connectionId) {
          issues.push({
            severity: "error",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: falta elegir la conexión de email.`,
          });
        }
        if (!output.to.trim()) {
          issues.push({
            severity: "error",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: falta el destinatario.`,
          });
        }
        break;
      }

      case "createTask": {
        const ref = output.projectRef ?? "explicit";
        if (ref === "explicit") {
          if (!output.projectId) {
            issues.push({
              severity: "error",
              nodeKind: "action",
              outputIndex: i,
              message: `${label}: falta elegir el proyecto destino.`,
            });
          } else if (!projectIds.has(output.projectId)) {
            issues.push({
              severity: "error",
              nodeKind: "action",
              outputIndex: i,
              message: `${label}: el proyecto destino ya no existe — elige otro.`,
            });
          }
        } else if (ref === "createdProject") {
          const hasPriorCreateProject = flow.outputs
            .slice(0, i)
            .some((o) => o.type === "createProject");
          if (!hasPriorCreateProject) {
            issues.push({
              severity: "error",
              nodeKind: "action",
              outputIndex: i,
              message: `${label}: usa "proyecto creado en este flujo" pero no hay una acción "Crear Proyecto" antes.`,
            });
          }
        }
        break;
      }

      case "createProject": {
        if (!output.name.trim()) {
          issues.push({
            severity: "error",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: falta el nombre del proyecto.`,
          });
        }
        break;
      }

      case "setField": {
        if (!output.field.trim()) {
          issues.push({
            severity: "error",
            nodeKind: "action",
            outputIndex: i,
            message: `${label}: falta indicar qué campo modificar.`,
          });
        }
        break;
      }

      case "createPerson":
      case "setProjectStatus":
      case "createNotification":
      case "markAreaComplete":
        break;
    }
  });

  // ── Tokens huérfanos contra la muestra persistida (solo si hay muestra —
  // sin ella no hay información para advertir, spec 025 §B) ───────────────
  if (flow.lastSample && flow.lastSample.length > 0) {
    const available = deriveAvailableVariables(flow.trigger, flow.lastSample);
    flow.outputs.forEach((output, i) => {
      const missing = new Set<string>();
      for (const template of outputTemplates(output)) {
        if (!template.includes("{{")) continue;
        const result = validateVariables(template, available);
        for (const m of result.missing) missing.add(m);
      }
      if (missing.size > 0) {
        const tokens = Array.from(missing)
          .map((m) => `{{${m}}}`)
          .join(", ");
        issues.push({
          severity: "warning",
          nodeKind: "action",
          outputIndex: i,
          message: `Acción ${i + 1} (${outputLabel(output)}): ${tokens} no existe en la muestra — quedaría vacío.`,
        });
      }
    });
  }

  return issues;
}

/** Azúcar para los consumidores: solo los errores (los warnings nunca
 * bloquean guardar ni activar — spec 027 §A). */
export function flowErrors(issues: FlowIssue[]): FlowIssue[] {
  return issues.filter((i) => i.severity === "error");
}
