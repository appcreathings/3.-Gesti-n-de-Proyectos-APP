import {
  WorkspaceSchema,
  emptyWorkspace,
  type Workspace,
} from "@/domain/schemas";
import { migrateRecord, type MigrationKind } from "@/domain/migrations";
import { idbGet, idbSet } from "./idb";
import {
  collectionSchema,
  emptyDoc,
  type Collection,
  type DocName,
  type StorageAdapter,
} from "./StorageAdapter";

/**
 * Fallback for non-Chromium browsers (Firefox/Safari): keeps everything in
 * IndexedDB and offers export/import to .json. Same contract as FileSystemAdapter
 * so the UI is unchanged (constitución, principio VI).
 */
const KEY = (s: string) => `download:${s}`;

export class DownloadAdapter implements StorageAdapter {
  readonly kind = "download" as const;
  private ready = false;
  private migrationBackupDone = false;

  isReady(): boolean {
    return this.ready;
  }

  getRootName(): string | null {
    return null;
  }

  async changeFolder(): Promise<void> {
    throw new Error("changeFolder no soportado en el modo descarga");
  }

  /** Migrate a read record up to the current schema version, snapshotting once first. */
  private async migrateOnRead<T extends Record<string, unknown>>(
    kind: MigrationKind,
    raw: unknown,
  ): Promise<{ value: T; migrated: boolean }> {
    const { value, migrated } = migrateRecord(kind, raw as Record<string, unknown>);
    if (migrated && !this.migrationBackupDone) {
      this.migrationBackupDone = true;
      await this.backup().catch(() => undefined);
    }
    return { value: value as T, migrated };
  }

  async init(): Promise<void> {
    const ws = await idbGet<Workspace>(KEY("workspace"));
    if (!ws) await idbSet(KEY("workspace"), emptyWorkspace());
    this.ready = true;
  }

  async connect(): Promise<void> {
    await this.init();
  }

  async reconnect(): Promise<boolean> {
    await this.init();
    return true;
  }

  async readWorkspace(): Promise<Workspace> {
    const ws = (await idbGet<Workspace>(KEY("workspace"))) ?? emptyWorkspace();
    const { value, migrated } = await this.migrateOnRead("workspace", ws);
    if (migrated) await idbSet(KEY("workspace"), value);
    return WorkspaceSchema.parse(value);
  }

  async writeWorkspace(ws: Workspace): Promise<void> {
    await idbSet(KEY("workspace"), WorkspaceSchema.parse(ws));
  }

  async list(col: Collection): Promise<string[]> {
    return (await idbGet<string[]>(KEY(`list:${col}`))) ?? [];
  }

  async read<T>(col: Collection, id: string): Promise<T> {
    const data = await idbGet<unknown>(KEY(`${col}:${id}`));
    const { value, migrated } = await this.migrateOnRead(col, data);
    if (migrated) await idbSet(KEY(`${col}:${id}`), value);
    return collectionSchema[col].parse(value) as T;
  }

  async write<T extends { id: string }>(col: Collection, data: T): Promise<void> {
    const validated = collectionSchema[col].parse(data);
    await idbSet(KEY(`${col}:${data.id}`), validated);
    const ids = await this.list(col);
    if (!ids.includes(data.id)) await idbSet(KEY(`list:${col}`), [...ids, data.id]);
  }

  async remove(col: Collection, id: string): Promise<void> {
    const ids = await this.list(col);
    await idbSet(
      KEY(`list:${col}`),
      ids.filter((x) => x !== id),
    );
    await idbSet(KEY(`${col}:${id}`), undefined);
  }

  async readDoc<T>(name: DocName): Promise<T> {
    const raw = await idbGet<Record<string, unknown>>(KEY(`doc:${name}`));
    if (raw == null) return emptyDoc(name) as T;
    const { value, migrated } = await this.migrateOnRead<Record<string, unknown>>(name, raw);
    if (migrated) await idbSet(KEY(`doc:${name}`), value);
    return value as T;
  }

  async writeDoc<T>(name: DocName, data: T): Promise<void> {
    await idbSet(KEY(`doc:${name}`), data);
  }

  async exportAll(): Promise<Blob> {
    const bundle: Record<string, unknown> = {
      workspace: await this.readWorkspace(),
    };
    const cols: Collection[] = [
      "products",
      "projects",
      "project-types",
      "checklist-templates",
      "process-templates",
      "automations",
      "quarters",
    ];
    for (const col of cols) {
      const ids = await this.list(col);
      bundle[col] = await Promise.all(ids.map((id) => this.read(col, id)));
    }
    bundle.people = await this.readDoc("people");
    bundle.notifications = await this.readDoc("notifications");
    bundle.activity = await this.readDoc("activity");
    return new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
  }

  async importAll(blob: Blob): Promise<void> {
    const bundle = JSON.parse(await blob.text()) as Record<string, unknown>;
    if (bundle.workspace) await this.writeWorkspace(bundle.workspace as Workspace);
    const cols: Collection[] = [
      "products",
      "projects",
      "project-types",
      "checklist-templates",
      "process-templates",
      "automations",
      "quarters",
    ];
    for (const col of cols) {
      const items = (bundle[col] as { id: string }[]) ?? [];
      for (const item of items) await this.write(col, item);
    }
    if (bundle.people) await this.writeDoc("people", bundle.people);
    if (bundle.notifications)
      await this.writeDoc("notifications", bundle.notifications);
    if (bundle.activity) await this.writeDoc("activity", bundle.activity);
  }

  async backup(): Promise<void> {
    await idbSet(KEY(`backup:${Date.now()}`), await (await this.exportAll()).text());
  }
}
