import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/useAppStore";
import { PeopleCard } from "./PeopleCard";
import { CollectionTransferCard } from "./CollectionTransferCard";
import { AiSettingsCard } from "./AiSettingsCard";

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
] as const;

export function SettingsPage() {
  const ws = useAppStore((s) => s.workspace);
  const adapter = useAppStore((s) => s.adapter);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateOrg = useAppStore((s) => s.updateOrg);
  const settings = ws?.settings;

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
      <PageHeader title="Ajustes" description="Preferencias y datos." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organización</CardTitle>
            <CardDescription>
              Nombre que aparece en la barra lateral y en el asistente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-md gap-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>Tema de la interfaz.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parámetros de gestión</CardTitle>
            <CardDescription>
              Umbrales usados por automatizaciones y dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-md gap-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <CardDescription>
              Exporta o importa todo tu espacio de trabajo en un único JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
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
          </CardContent>
        </Card>

        <AiSettingsCard />

        <CollectionTransferCard />

        <PeopleCard />
      </div>
    </div>
  );
}
