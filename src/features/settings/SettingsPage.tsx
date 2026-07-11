import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Download, FolderOpen, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/useAppStore";
import { PeopleCard } from "./PeopleCard";
import { CollectionTransferCard } from "./CollectionTransferCard";
import { AiSettingsCard } from "./AiSettingsCard";
import { RagSettingsCard } from "./RagSettingsCard";

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
] as const;

export function SettingsPage() {
  return (
    <>
      <Helmet>
        <title>Configuración | Hito</title>
        <meta name="description" content="Ajustes de organización, preferencias, exportación e importación de datos en Hito." />
      </Helmet>
      <SettingsContent />
    </>
  );
}

function SettingsContent() {
  const ws = useAppStore((s) => s.workspace);
  const adapter = useAppStore((s) => s.adapter);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateOrg = useAppStore((s) => s.updateOrg);
  const changeFolder = useAppStore((s) => s.changeFolder);
  const settings = ws?.settings;
  const folderName = adapter.getRootName();

  const [orgName, setOrgName] = useState(ws?.org.name ?? "");
  useEffect(() => {
    setOrgName(ws?.org.name ?? "");
  }, [ws?.org.name]);

  // Deep-link a una sección concreta (p. ej. /settings#ia desde el asistente).
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (!settings) return null;

  async function onExport() {
    const blob = await adapter.exportAll();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hito-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await adapter.importAll(file);
    await useAppStore.getState().refreshWorkspace();
  }

  return (
    <div>
      <PageHeader label="Ajustes" title="Ajustes" description="Preferencias y datos." />

      <div className="grid gap-6">
        <Panel label="Organización" title="Organización" description="Nombre que aparece en la barra lateral y en el asistente.">
          <div className="flex max-w-md gap-2">
            <Input
              value={orgName}
              aria-label="Nombre de la organización"
              onChange={(e) => setOrgName(e.target.value)}
            />
            <Button
              size="sm"
              className="shrink-0 self-center"
              disabled={!orgName.trim() || orgName.trim() === ws?.org.name}
              onClick={() => updateOrg(orgName.trim())}
            >
              Guardar
            </Button>
          </div>
        </Panel>

        {adapter.kind === "filesystem" && (
          <Panel
            label="Almacenamiento"
            title="Carpeta de datos"
            description="Cambia la carpeta local donde se guardan tus proyectos."
          >
            <div className="flex max-w-md items-center gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">
                  {folderName ?? "Sin carpeta"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto shrink-0"
                onClick={changeFolder}
              >
                Cambiar carpeta
              </Button>
            </div>
          </Panel>
        )}

        <Panel label="Apariencia" title="Apariencia" description="Tema de la interfaz.">
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <Button
                key={t.value}
                variant={settings.theme === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings({ theme: t.value })}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel
          label="Parámetros"
          title="Parámetros de gestión"
          description="Umbrales usados por automatizaciones y dashboard."
        >
          <div className="grid max-w-md gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="stalled">
                Proyecto estancado tras (días sin cambios)
              </Label>
              <Input
                id="stalled"
                type="number"
                min={1}
                value={settings.stalledAfterDays}
                onChange={(e) =>
                  updateSettings({ stalledAfterDays: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="duesoon">Avisar "por vencer" con (días) de antelación</Label>
              <Input
                id="duesoon"
                type="number"
                min={1}
                value={settings.dueSoonDays}
                onChange={(e) =>
                  updateSettings({ dueSoonDays: Number(e.target.value) })
                }
              />
            </div>
            <label className="flex items-start gap-3 pt-1">
              <Checkbox
                checked={settings.deriveHealth}
                onCheckedChange={(v) => updateSettings({ deriveHealth: v })}
                aria-label="Derivar salud automáticamente"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">Salud RAG automática</span>
                <span className="text-xs text-muted-foreground">
                  Deriva la salud de cada proyecto: rojo si está estancado o vencido, ámbar si
                  hay fechas por vencer. Si se desactiva, se usa la salud manual.
                </span>
              </span>
            </label>
          </div>
        </Panel>

        <Panel
          label="Datos"
          title="Datos"
          description="Exporta o importa todo tu espacio de trabajo en un único JSON."
        >
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="size-4" />
              Exportar todo
            </Button>
            <label
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer",
              )}
            >
              <Upload className="size-4" />
              Importar
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImport}
              />
            </label>
          </div>
        </Panel>

        <AiSettingsCard />

        <RagSettingsCard />

        <CollectionTransferCard />

        <PeopleCard />
      </div>
    </div>
  );
}
