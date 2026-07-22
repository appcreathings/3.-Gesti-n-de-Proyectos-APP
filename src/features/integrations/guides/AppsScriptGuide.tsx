import { useState } from "react";
import { Check, ChevronRight, ChevronLeft, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConnectionProvider } from "@/integrations/connections";

interface AppsScriptGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ConnectionProvider;
}

const HUBSPOT_CODE = `/**
 * Hito HubSpot Proxy
 *
 * Este script actúa como intermediario entre Hito (que corre en tu navegador)
 * y la API de HubSpot. Resuelve el problema de CORS permitiendo que Hito
 * haga peticiones a HubSpot a través de este proxy.
 *
 * INSTRUCCIONES:
 * 1. Pega este código en script.google.com
 * 2. Despliega como Web App (ver guía en Hito)
 * 3. Copia la URL del Web App y pégala en Hito
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const hubspotToken = data._hubspotToken;
    const path = data.path;
    const method = data.method || "GET";
    const body = data.body;

    // Remover campos de control antes de enviar a HubSpot
    delete data._hubspotToken;
    delete data.path;
    delete data.method;
    delete data.body;

    if (!hubspotToken) {
      return jsonResponse({ error: "Missing _hubspotToken" }, 400);
    }

    if (!path) {
      return jsonResponse({ error: "Missing path" }, 400);
    }

    // Construir URL de HubSpot
    const url = \`https://api.hubapi.com\${path}\`;

    // Preparar opciones de la petición
    const options = {
      method: method,
      headers: {
        "Authorization": \`Bearer \${hubspotToken}\`,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    // Añadir body si es POST/PUT/PATCH
    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      options.payload = JSON.stringify(body);
    }

    // Hacer petición a HubSpot
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // Intentar parsear como JSON
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch (parseError) {
      responseBody = { raw: responseText };
    }

    return jsonResponse({
      status: responseCode,
      data: responseBody
    }, responseCode >= 200 && responseCode < 300 ? 200 : responseCode);

  } catch (error) {
    return jsonResponse({
      error: "Proxy error",
      message: error.toString()
    }, 500);
  }
}

function doGet(e) {
  try {
    const path = e.parameter.path;
    const token = e.parameter.token;

    if (!token) {
      return jsonResponse({ error: "Missing token parameter" }, 400);
    }

    if (!path) {
      return jsonResponse({ error: "Missing path parameter" }, 400);
    }

    const url = \`https://api.hubapi.com\${path}\`;

    const options = {
      method: "GET",
      headers: {
        "Authorization": \`Bearer \${token}\`,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch (parseError) {
      responseBody = { raw: responseText };
    }

    return jsonResponse({
      status: responseCode,
      data: responseBody
    }, responseCode >= 200 && responseCode < 300 ? 200 : responseCode);

  } catch (error) {
    return jsonResponse({
      error: "Proxy error",
      message: error.toString()
    }, 500);
  }
}

function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

const SHEETS_CODE = `/**
 * Hito Google Sheets Proxy
 *
 * Este script actúa como intermediario entre Hito (que corre en tu navegador)
 * y una hoja de cálculo de Google Sheets. Corre bajo tu propia cuenta de
 * Google — no necesitas iniciar sesión con OAuth desde el navegador ni
 * exponer ningún token; el script ya tiene acceso a cualquier hoja tuya.
 *
 * INSTRUCCIONES:
 * 1. Pega este código en script.google.com
 * 2. Despliega como Web App (ver guía en Hito)
 * 3. Copia la URL del Web App y pégala en Hito
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "read") {
      const sheet = SpreadsheetApp.openById(data.spreadsheetId);
      const range = sheet.getRange(data.range);
      const values = range.getValues();
      return jsonResponse({ status: 200, data: { values: values } }, 200);
    }

    return jsonResponse({ status: 400, data: { error: "Unknown action: " + data.action } }, 400);
  } catch (error) {
    return jsonResponse({ status: 500, data: { error: error.toString() } }, 500);
  }
}

function doGet(e) {
  return jsonResponse({ status: 200, data: { ok: true } }, 200);
}

function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

const EMAIL_CODE = `/**
 * Hito Email Proxy
 *
 * Envía correos desde tu propia cuenta de Google (MailApp) cuando un Flujo
 * de Hito ejecuta la acción "Enviar email". No usa SMTP ni guarda ninguna
 * contraseña — corre bajo tu cuenta y consume tu cuota diaria de envío de
 * Gmail/Workspace.
 *
 * INSTRUCCIONES:
 * 1. Pega este código en script.google.com
 * 2. Despliega como Web App (ver guía en Hito)
 * 3. Copia la URL del Web App y pégala en Hito, en la conexión de Email
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!data.to || !data.subject) {
      return jsonResponse({ error: "Missing to/subject" }, 400);
    }

    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.htmlBody || "",
      name: "Hito"
    });

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function doGet(e) {
  return jsonResponse({ ok: true }, 200);
}

function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

const INBOX_CODE = `/**
 * Hito Inbox Proxy
 *
 * Recibe datos que Make / Zapier / n8n empujan hacia Hito y los acumula en una
 * pestaña de esta hoja ("_hito_inbox"). Hito los drena por polling desde el
 * navegador (no hay servidor de Hito escuchando webhooks). Corre bajo tu propia
 * cuenta de Google.
 *
 * INSTRUCCIONES:
 * 1. Crea (o abre) una Google Sheet y pega este código en Extensiones → Apps Script
 * 2. Opcional: define un secreto compartido en INBOX_SECRET (abajo)
 * 3. Despliega como Web App (acceso "Cualquier persona")
 * 4. Copia la URL /exec:
 *      - pégala en Hito, en la conexión "Make/Zapier (inbox)"
 *      - pégala también en el módulo Webhook de Make / paso Webhooks de Zapier
 */

const INBOX_SECRET = ""; // opcional: exige ?secret=... a quien encola. Vacío = abierto.
const SHEET_NAME = "_hito_inbox";
const MAX_ROWS = 500; // retención FIFO; más viejas se descartan

function doPost(e) {
  var body = e.postData ? e.postData.contents : "";
  var parsed = safeJson(body);

  // Drenado (lo llama Hito): { action: "drain", cursor, max, secret? }
  if (parsed && parsed.action === "drain") {
    if (INBOX_SECRET && parsed.secret !== INBOX_SECRET) {
      return json({ status: 401, data: { error: "bad secret" } });
    }
    return drain(parsed);
  }

  // Ingreso (lo llama Make/Zapier): cualquier otro POST
  if (INBOX_SECRET && e.parameter.secret !== INBOX_SECRET) {
    return json({ status: 401, data: { error: "bad secret" } });
  }
  var delivery = {
    deliveryId: Utilities.getUuid(),
    receivedAt: new Date().toISOString(),
    body: parsed !== null ? parsed : { raw: body }
  };
  appendDelivery(delivery);
  return json({ status: 200, data: { deliveryId: delivery.deliveryId } });
}

function doGet(e) {
  return json({ status: 200, data: { ok: true } });
}

function drain(req) {
  var cursor = req.cursor || "";
  var max = req.max || 100;
  var sheet = getSheet();
  var values = sheet.getDataRange().getValues(); // [[receivedAt, deliveryId, bodyJson], ...]
  var pending = [];
  for (var i = 1; i < values.length; i++) {
    var receivedAt = values[i][0];
    if (receivedAt > cursor) {
      pending.push({ receivedAt: receivedAt, deliveryId: values[i][1], body: safeJson(values[i][2]) });
    }
  }
  pending.sort(function (a, b) { return a.receivedAt < b.receivedAt ? -1 : 1; });
  var batch = pending.slice(0, max);
  var nextCursor = batch.length ? batch[batch.length - 1].receivedAt : cursor;
  return json({ status: 200, data: { deliveries: batch, nextCursor: nextCursor, backlog: pending.length } });
}

function appendDelivery(delivery) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet();
    sheet.appendRow([delivery.receivedAt, delivery.deliveryId, JSON.stringify(delivery.body)]);
    var rows = sheet.getLastRow();
    if (rows > MAX_ROWS + 1) {
      sheet.deleteRows(2, rows - (MAX_ROWS + 1)); // borra las más viejas (fila 1 = header)
    }
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["receivedAt", "deliveryId", "body"]);
  }
  return sheet;
}

function safeJson(s) {
  try { return JSON.parse(s); } catch (err) { return null; }
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
`;

const PROVIDER_CONTENT = {
  hubspot: {
    label: "HubSpot",
    projectName: "Hito HubSpot Proxy",
    code: HUBSPOT_CODE,
    why: "HubSpot no permite llamadas directas desde el navegador por razones de seguridad (CORS). Este proxy actúa como intermediario: Hito → Proxy → HubSpot.",
    secure: "Sí. El proxy corre en tu propia cuenta de Google. Tus credenciales nunca salen de tu navegador excepto hacia HubSpot.",
  },
  "google-sheets": {
    label: "Google Sheets",
    projectName: "Hito Sheets Proxy",
    code: SHEETS_CODE,
    why: "El navegador no puede leer una hoja de Google sin pedirte iniciar sesión con OAuth cada vez. Este proxy corre bajo tu propia cuenta de Google (que ya tiene acceso a tus hojas) y te evita ese paso.",
    secure: "Sí. El proxy corre en tu propia cuenta de Google — no expone ningún token; Hito solo le pide leer un rango de una hoja.",
  },
  email: {
    label: "Email",
    projectName: "Hito Email Proxy",
    code: EMAIL_CODE,
    why: "La acción \"Enviar email\" de un Flujo necesita un servicio de correo del lado del servidor — un navegador no puede autenticarse con un servidor SMTP sin exponer una contraseña. Este proxy usa tu propia cuenta de Google (MailApp) para enviar.",
    secure: "Sí. Corre en tu cuenta de Google; Hito nunca ve ni guarda una contraseña de correo. El límite de envíos por día lo define tu cuenta de Gmail/Workspace (Apps Script hereda esa cuota).",
  },
  "webhook-inbox": {
    label: "Make/Zapier (inbox)",
    projectName: "Hito Inbox Proxy",
    code: INBOX_CODE,
    why: "Hito corre en tu navegador y no puede recibir webhooks pasivos (eso requeriría un servidor). Este proxy acumula lo que Make/Zapier/n8n empujan en una hoja tuya, y Hito lo drena por polling — el mismo modelo local-first que HubSpot/Sheets, pero al revés.",
    secure: "Sí. El buffer vive en una hoja de tu propia cuenta de Google. Puedes exigir un secreto compartido (INBOX_SECRET) para que solo tu escenario de Make/Zapier pueda encolar.",
  },
} satisfies Record<ConnectionProvider, { label: string; projectName: string; code: string; why: string; secure: string }>;

function getSteps(provider: ConnectionProvider, content: (typeof PROVIDER_CONTENT)[keyof typeof PROVIDER_CONTENT]) {
  const steps = [
    {
      id: "intro",
      title: "¿Qué es esto?",
      description: `Google Apps Script es un servicio gratuito de Google que nos permite crear un "proxy" para conectar Hito con ${content.label}.`,
    },
    {
      id: "open-apps-script",
      title: "Abre Google Apps Script",
      description: "Ve a script.google.com e inicia sesión con tu cuenta de Google.",
    },
    {
      id: "create-project",
      title: "Crea un nuevo proyecto",
      description: `Haz clic en 'Nuevo proyecto' y ponle un nombre como '${content.projectName}'.`,
    },
    {
      id: "paste-code",
      title: "Pega el código del proxy",
      description: "Copia el siguiente código y pégalo en el editor de Apps Script, reemplazando todo el contenido.",
    },
    {
      id: "deploy",
      title: "Despliega como Web App",
      description: "Configura el despliegue para que cualquier persona pueda acceder.",
    },
    {
      id: "copy-url",
      title: "Copia la URL del Web App",
      description: "Después de desplegar, copia la URL que aparece. Esta es tu 'Proxy URL'.",
    },
  ];

  if (provider === "hubspot") {
    steps.push({
      id: "hubspot-private-app",
      title: "Crea una App Privada de HubSpot",
      description: "Genera el Access Token que Hito necesita para leer tus contactos, negocios y tickets.",
    });
  }

  steps.push({
    id: "configure-hito",
    title: "Configura Hito",
    description:
      provider === "hubspot"
        ? `Pega la URL y el Access Token en la conexión de ${content.label} en Hito.`
        : `Pega la URL en la conexión de ${content.label} en Hito.`,
  });

  // Spec 033 A3 §T3331: paso de checklist exclusivo del inbox — el usuario
  // debe pegar la Proxy URL en su escenario de Make/Zapier para que el
  // round-trip (push → drain) quede completo.
  if (provider === "webhook-inbox") {
    steps.push({
      id: "paste-in-make",
      title: "Pega la URL en Make/Zapier",
      description:
        "En tu escenario de Make (módulo Webhook) o Zapier (paso Webhooks), pega esta misma Proxy URL — ahí es donde tu automatización empujará los datos hacia Hito. Márcalo como completado cuando lo hayas pegado.",
    });
  }

  return steps;
}

export function AppsScriptGuide({ open, onOpenChange, provider }: AppsScriptGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const content = PROVIDER_CONTENT[provider];
  const steps = getSteps(provider, content);
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(content.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    onOpenChange(false);
    setCurrentStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Guía de configuración: Proxy {content.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paso {currentStep + 1} de {steps.length}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 border-b border-border px-6 pt-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                completedSteps.has(idx)
                  ? "bg-success"
                  : idx === currentStep
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                {completedSteps.has(currentStep) ? (
                  <Check className="size-5" />
                ) : (
                  currentStep + 1
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Step-specific content */}
            {step.id === "intro" && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    💡
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>¿Por qué necesito esto?</strong>
                    </p>
                    <p>{content.why}</p>
                    <p>
                      <strong>¿Es seguro?</strong> {content.secure}
                    </p>
                    <p>
                      <strong>¿Cuánto cuesta?</strong> Nada. Google Apps Script es gratuito para uso personal.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step.id === "open-apps-script" && (
              <div className="space-y-4">
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
                >
                  <ExternalLink className="size-4" />
                  Abrir script.google.com
                </a>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p>Inicia sesión con tu cuenta de Google si aún no lo has hecho.</p>
                </div>
              </div>
            )}

            {step.id === "create-project" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en <strong>"+ Nuevo proyecto"</strong> en la esquina superior izquierda.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Renombra el proyecto a{" "}
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{content.projectName}</code>
                  </p>
                </div>
              </div>
            )}

            {step.id === "paste-code" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Code.gs</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                      className="h-8 gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-success" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copiar código
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="max-h-96 overflow-auto p-4 text-xs">
                    <code className="font-mono text-foreground">{content.code}</code>
                  </pre>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
                  <p className="font-medium text-warning">Importante:</p>
                  <p className="mt-1 text-muted-foreground">
                    Asegúrate de reemplazar <strong>todo</strong> el contenido del archivo <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Code.gs</code> con el código de arriba.
                  </p>
                </div>
              </div>
            )}

            {step.id === "deploy" && (
              <div className="space-y-4">
                <ol className="space-y-4">
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      1
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Haz clic en "Desplegar" → "Nuevo despliegue"</p>
                      <p className="mt-1 text-muted-foreground">
                        En el menú superior, haz clic en el botón azul "Desplegar".
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      2
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Selecciona tipo: "Aplicación web"</p>
                      <p className="mt-1 text-muted-foreground">
                        En el dropdown "Tipo", selecciona "Aplicación web".
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      3
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Configura el acceso</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• <strong>Ejecutar como:</strong> "Yo"</li>
                        <li>• <strong>Quién tiene acceso:</strong> "Cualquier persona"</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      4
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Haz clic en "Desplegar"</p>
                      <p className="mt-1 text-muted-foreground">
                        Google te pedirá autorización. Acepta los permisos.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {step.id === "copy-url" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center">
                  <CheckCircle2 className="mx-auto size-12 text-success" />
                  <p className="mt-3 font-medium">¡Despliegue exitoso!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Google te mostrará una URL como esta:
                  </p>
                  <code className="mt-3 block rounded bg-muted p-3 text-xs font-mono">
                    https://script.google.com/macros/s/AKfycbx.../exec
                  </code>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <strong>Copia esta URL completa.</strong> La necesitarás en el siguiente paso.
                  </p>
                </div>
              </div>
            )}

            {step.id === "hubspot-private-app" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p>
                    Esto es distinto del proxy que acabas de desplegar: el proxy mueve las
                    peticiones, pero HubSpot igual necesita saber que Hito tiene permiso de leer tus
                    datos. Ese permiso es un <strong>token de una App Privada</strong> (el reemplazo
                    moderno de las API Keys clásicas de HubSpot, retiradas en 2022).
                  </p>
                </div>
                <ol className="space-y-4">
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      1
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Ve a Configuración → Integraciones → Apps privadas</p>
                      <a
                        href="https://app.hubspot.com/private-apps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        Abrir Apps privadas de HubSpot
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      2
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Crea una app privada</p>
                      <p className="mt-1 text-muted-foreground">
                        Botón "Crear una app privada". Dale un nombre, por ejemplo "Hito".
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      3
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">En la pestaña "Scopes", marca los permisos de lectura</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>
                          • <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">crm.objects.contacts.read</code>
                        </li>
                        <li>
                          • <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">crm.objects.deals.read</code>{" "}
                          (si vas a sincronizar negocios)
                        </li>
                        <li>
                          • <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">crm.objects.tickets.read</code>{" "}
                          (si vas a sincronizar tickets)
                        </li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      4
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Crea la app y copia el token</p>
                      <p className="mt-1 text-muted-foreground">
                        Botón "Crear app" → confirma. HubSpot te muestra el token{" "}
                        <strong>una sola vez</strong> (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pat-na1-...</code>
                        ). Cópialo ahora — si lo pierdes, tendrás que generar uno nuevo desde la
                        pestaña "Auth" de la misma app.
                      </p>
                    </div>
                  </li>
                </ol>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
                  <p className="font-medium text-warning">Nota sobre apps privadas "legacy"</p>
                  <p className="mt-1 text-muted-foreground">
                    Si tu cuenta de HubSpot todavía muestra el flujo anterior de apps privadas (sin
                    una pestaña "Scopes" separada), los permisos de lectura de Contactos/Negocios/
                    Tickets se marcan en la sección "CRM" del mismo formulario de creación — el resto
                    de los pasos es igual.
                  </p>
                </div>
              </div>
            )}

            {step.id === "configure-hito" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-6">
                  <p className="text-sm">
                    Ahora ve a <strong>Integraciones → {content.label}</strong> en Hito, haz clic en{" "}
                    <strong>"Nueva conexión"</strong> y pega la URL que copiaste en el campo{" "}
                    <strong>"Proxy URL"</strong>
                    {provider === "google-sheets" && (
                      <>
                        {" "}(junto con el <strong>ID del Spreadsheet</strong> y el <strong>Rango</strong> que
                        quieras leer)
                      </>
                    )}
                    {provider === "hubspot" && (
                      <>
                        {" "}junto con el <strong>Access Token</strong> que copiaste en el paso anterior
                      </>
                    )}
                    {provider === "email" && (
                      <>
                        {" "}(el <strong>Email remitente</strong> es solo referencia visual — el envío
                        real sale siempre desde tu cuenta de Google, MailApp no permite falsificar el
                        remitente)
                      </>
                    )}
                    {provider === "webhook-inbox" && (
                      <>
                        {" "}(y si definiste un <strong>secreto</strong> en <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">INBOX_SECRET</code>,
                        pégalo también). <strong>Además</strong>, pega esta misma URL en el módulo{" "}
                        <strong>Webhook</strong> de Make o el paso <strong>Webhooks</strong> de Zapier —
                        ahí es donde tu escenario empujará los datos hacia Hito
                      </>
                    )}
                    .
                  </p>
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Proxy URL</label>
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      readOnly
                      value=""
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
                  <p className="font-medium text-success">✓ ¡Listo!</p>
                  <p className="mt-1 text-muted-foreground">
                    Una vez configurado, Hito podrá sincronizar datos con {content.label} automáticamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {isLastStep ? (
              <Button onClick={handleFinish} className="gap-2">
                <Check className="size-4" />
                Finalizar
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
