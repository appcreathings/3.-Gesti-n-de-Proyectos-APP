import { useState } from "react";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface WebhookSignatureGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENVELOPE_EXAMPLE = `{
  "eventId": "8f14e45f-ceea-4f6a-b0a1-2c3d4e5f6789",
  "eventType": "flow.execution",
  "timestamp": "2026-07-17T14:32:00.000Z",
  "workspace": { "org": "Hito" },
  "data": { /* registro completo o campos personalizados */ }
}`;

const EXPRESS_CODE = `const express = require("express");
const crypto = require("crypto");

const app = express();
const WEBHOOK_SECRET = process.env.HITO_WEBHOOK_SECRET; // el mismo "Secret" configurado en Hito

// Importante: usamos el body CRUDO (sin parsear), porque la firma se
// calculó sobre el JSON exacto tal cual se envió por la red.
app.post(
  "/webhooks/hito",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signatureHeader = req.get("X-Hito-Signature") || "";

    const expected =
      "sha256=" +
      crypto.createHmac("sha256", WEBHOOK_SECRET).update(req.body).digest("hex");

    const valid =
      signatureHeader.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));

    if (!valid) {
      return res.status(401).send("Firma inválida");
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    console.log("Evento recibido:", payload.eventType, payload.data);

    res.status(200).send("OK");
  }
);

app.listen(3000, () => console.log("Escuchando en :3000"));`;

const PYTHON_CODE = `import hashlib
import hmac
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = "whsec_..."  # el mismo "Secret" configurado en Hito

@app.post("/webhooks/hito")
def hito_webhook():
    raw_body = request.get_data()  # bytes crudos — NO uses request.json aquí
    signature_header = request.headers.get("X-Hito-Signature", "")

    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature_header, expected):
        abort(401, "Firma inválida")

    payload = request.get_json()
    print("Evento recibido:", payload["eventType"], payload["data"])

    return "OK", 200`;

const APPS_SCRIPT_CODE = `// Google Apps Script no expone los headers HTTP entrantes en doPost(e),
// así que X-Hito-Signature no se puede leer aquí. Alternativa: usa un
// segmento secreto en la propia URL en vez de depender de la firma.

function doPost(e) {
  const SECRET_TOKEN = "un-token-largo-y-aleatorio-que-solo-tu-conoces";

  if (e.parameter.token !== SECRET_TOKEN) {
    return ContentService.createTextOutput("No autorizado")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const payload = JSON.parse(e.postData.contents);
  Logger.log("Evento recibido: " + payload.eventType);

  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

// En Hito, configura la URL del webhook como:
// https://script.google.com/macros/s/AKfycb.../exec?token=un-token-largo-y-aleatorio-que-solo-tu-conoces`;

const ZAPIER_CODE = `// Step "Code by Zapier" (JavaScript), después del trigger "Catch Hook"
const crypto = require("crypto");

const secret = "whsec_..."; // el mismo "Secret" configurado en Hito
const rawBody = inputData.rawBody;           // mapea el cuerpo crudo del paso "Catch Hook"
const signatureHeader = inputData.signature; // mapea el header X-Hito-Signature

const expected =
  "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

if (signatureHeader !== expected) {
  throw new Error("Firma de Hito inválida — se descarta el evento");
}

output = [{ ok: true, payload: JSON.parse(rawBody) }];`;

const MAKE_FORMULA = `// Fórmula en un módulo "Set variable" de Make, después de un
// "Custom webhook" que recibe el POST de Hito
"sha256=" + hmac({{1.body}}; "sha256"; "whsec_..."; "hex")

// Compara ese resultado contra {{1.headers.x-hito-signature}} en un
// filtro/Router: si no coinciden, descarta el evento.`;

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-2">
          {copied ? (
            <>
              <CheckCircle2 className="size-3.5 text-success" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copiar
            </>
          )}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto p-4 text-xs">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

export function WebhookSignatureGuide({ open, onOpenChange }: WebhookSignatureGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cómo verificar la firma del webhook</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3 text-sm">
            <p>
              Cada envío incluye el header{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                X-Hito-Signature: sha256=&lt;hex&gt;
              </code>
              , calculado como HMAC-SHA256 del cuerpo de la petición usando el{" "}
              <strong>Secret</strong> que configuraste arriba como clave.
            </p>
            <p>
              En modo <strong>Envelope firmado</strong> (recomendado), el cuerpo enviado (body)
              tiene esta forma:
            </p>
            <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
              <code className="font-mono">{ENVELOPE_EXAMPLE}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              En modo <strong>Payload plano</strong>, el body es directamente el registro/campos
              (sin el envelope). En ambos casos la firma cubre el body exacto que se envía, así que
              la verificación es idéntica: <code className="rounded bg-muted px-1 py-0.5 font-mono">HMAC(body_crudo)</code>.
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <p className="text-xs text-muted-foreground">
                La firma se calcula sobre los <strong>bytes crudos exactos</strong> del JSON
                enviado. Verifica contra el body tal cual llega — si lo parseas y lo vuelves a
                serializar antes de comparar, el orden de las llaves puede cambiar y la
                verificación fallará aunque el evento sea legítimo.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Cada envío incluye también los headers{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">X-Hito-Delivery</code>{" "}
              (id único de la entrega) y{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">X-Hito-Timestamp</code>{" "}
              (ISO). Para rechazar reenvíos (replay), compara ese timestamp contra la hora actual y
              descarta lo que caiga fuera de una ventana corta (por ejemplo, 5 minutos), además de
              verificar la firma.
            </p>
          </div>

          <Tabs defaultValue="express">
            <TabsList>
              <TabsTrigger value="express">Express</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="apps-script">Apps Script</TabsTrigger>
              <TabsTrigger value="zapier">Zapier</TabsTrigger>
              <TabsTrigger value="make">Make</TabsTrigger>
            </TabsList>

            <TabsContent value="express">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Usa <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">express.raw()</code>{" "}
                  en vez del parser JSON por defecto, para tener acceso al buffer crudo antes de
                  parsearlo.
                </p>
                <CodeBlock label="server.js" code={EXPRESS_CODE} />
              </div>
            </TabsContent>

            <TabsContent value="python">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Usa <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">request.get_data()</code>{" "}
                  para los bytes crudos — no <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">request.json</code>,
                  que ya reserializa el objeto.
                </p>
                <CodeBlock label="app.py (Flask)" code={PYTHON_CODE} />
              </div>
            </TabsContent>

            <TabsContent value="apps-script">
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Limitación:</strong> <code className="rounded bg-muted px-1 py-0.5 font-mono">doPost(e)</code>{" "}
                    de Apps Script no expone los headers HTTP entrantes, así que{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">X-Hito-Signature</code> no se puede
                    leer ahí. La alternativa práctica es usar un token secreto en la propia URL en
                    lugar de verificar la firma, o poner un proxy pequeño delante (por ejemplo un
                    Cloudflare Worker) que sí valide la firma y solo entonces reenvíe a Apps Script.
                  </p>
                </div>
                <CodeBlock label="Code.gs" code={APPS_SCRIPT_CODE} />
              </div>
            </TabsContent>

            <TabsContent value="zapier">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Encadena un trigger <strong>"Catch Hook"</strong> (Webhooks by Zapier) con un
                  step <strong>"Code by Zapier"</strong> (JavaScript, que sí trae el módulo{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">crypto</code> de Node).
                  Busca en los campos disponibles del paso "Catch Hook" el header{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-Hito-Signature</code> y el
                  cuerpo crudo (el nombre exacto del campo varía según tu cuenta/versión de Zapier),
                  y mapéalos como <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">inputData</code>{" "}
                  al step de código.
                </p>
                <CodeBlock label="Code by Zapier" code={ZAPIER_CODE} />
              </div>
            </TabsContent>

            <TabsContent value="make">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Con un módulo <strong>"Custom webhook"</strong> como trigger, algunos planes de
                  Make incluyen la función general{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">hmac()</code> para calcular la
                  firma directamente en un módulo "Set variable" o en un filtro/Router. Si tu plan
                  no la incluye, llama a una función serverless pequeña (Cloudflare Worker, Vercel
                  Function, etc.) que haga la verificación por ti.
                </p>
                <CodeBlock label="Fórmula en Make" code={MAKE_FORMULA} />
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
