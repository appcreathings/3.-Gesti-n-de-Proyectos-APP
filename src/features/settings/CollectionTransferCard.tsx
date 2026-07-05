import { useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn, nowIso } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import type { Collection, DocName, StorageAdapter } from "@/storage";

type Key = Collection | DocName;

const ITEMS: { key: Key; label: string }[] = [
  { key: "products", label: "Productos" },
  { key: "projects", label: "Proyectos" },
  { key: "project-types", label: "Tipos de proyecto" },
  { key: "checklist-templates", label: "Plantillas de checklist" },
  { key: "process-templates", label: "Plantillas de proceso" },
  { key: "automations", label: "Automatizaciones" },
  { key: "people", label: "Personas" },
  { key: "notifications", label: "Notificaciones" },
];

const DOCS = new Set<Key>(["people", "notifications"]);
const isDoc = (k: Key): k is DocName => DOCS.has(k);

async function exportCollection(adapter: StorageAdapter, key: Key): Promise<Blob> {
  const data = isDoc(key)
    ? await adapter.readDoc(key)
    : await Promise.all((await adapter.list(key)).map((id) => adapter.read(key, id)));
  const payload = { collection: key, exportedAt: nowIso(), data };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

async function importCollection(adapter: StorageAdapter, key: Key, file: File): Promise<void> {
  const parsed = JSON.parse(await file.text()) as { data?: unknown } | unknown;
  const data = (parsed as { data?: unknown }).data ?? parsed;
  if (isDoc(key)) {
    await adapter.writeDoc(key, data);
  } else {
    const items = (Array.isArray(data) ? data : []) as { id: string }[];
    for (const item of items) await adapter.write(key, item);
  }
}

export function CollectionTransferCard() {
  const adapter = useAppStore((s) => s.adapter);
  const [key, setKey] = useState<Key>("projects");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = ITEMS.find((i) => i.key === key)?.label ?? key;

  async function onExport() {
    setError(null);
    const blob = await exportCollection(adapter, key);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await importCollection(adapter, key, file);
      await useAppStore.getState().refreshWorkspace();
      await useDataStore.getState().hydrate();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar / exportar por colección</CardTitle>
        <CardDescription>
          Mueve una sola colección entre espacios de trabajo. Al importar, las entradas con el
          mismo id se sobrescriben (no borra las que no estén en el archivo).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Select
          value={key}
          onChange={(e) => setKey(e.target.value as Key)}
          className="h-9 max-w-xs"
          aria-label="Colección a importar o exportar"
        >
          {ITEMS.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </Select>
        <Button variant="outline" size="sm" onClick={() => void onExport()} disabled={busy}>
          <Download className="size-4" />
          Exportar
        </Button>
        <label
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer",
            busy && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="size-4" />
          Importar {label}
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
            disabled={busy}
          />
        </label>
        {error && <p className="w-full text-sm text-destructive">Error al importar: {error}</p>}
      </CardContent>
    </Card>
  );
}
