import { ZodError } from "zod";
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

const HANDLE_KEY = "rootDirHandle";
const WORKSPACE_FILE = "workspace.json";

/** Folders created on bootstrap, one per collection + the aggregated docs. */
const COLLECTION_DIRS: Collection[] = [
  "products",
  "projects",
  "project-types",
  "checklist-templates",
  "process-templates",
  "automations",
];
const DOC_DIRS: Record<DocName, string> = {
  people: "people",
  notifications: "notifications",
  activity: "activity",
};

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export class FileSystemAdapter implements StorageAdapter {
  readonly kind = "filesystem" as const;
  private root: FileSystemDirectoryHandle | null = null;
  /** Ensures a single snapshot is taken before the first migration of a session. */
  private migrationBackupDone = false;

  isReady(): boolean {
    return this.root !== null;
  }

  /**
   * Bring a freshly-read record up to the current schema version, snapshotting
   * once before the first migration of the session (constitución, principio VI).
   * No-op while everything is at v1.
   */
  private async migrateOnRead<T extends Record<string, unknown>>(
    kind: MigrationKind,
    json: unknown,
  ): Promise<{ value: T; migrated: boolean }> {
    const { value, migrated } = migrateRecord(kind, json as Record<string, unknown>);
    if (migrated && !this.migrationBackupDone) {
      this.migrationBackupDone = true;
      await this.backup().catch(() => undefined);
    }
    return { value: value as T, migrated };
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  /** Recover a previously stored handle (does not prompt). */
  async init(): Promise<void> {
    const handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY);
    if (!handle) return;
    const ok = await verifyPermission(handle, false);
    if (ok) {
      this.root = handle;
      await this.bootstrap();
    } else {
      // Keep the handle; UI will offer "Reconnect" (needs a user gesture).
      this.root = null;
    }
  }

  /** Prompt for a folder (requires a user gesture). */
  async connect(): Promise<void> {
    if (!window.showDirectoryPicker) {
      throw new StorageError("File System Access API no soportada");
    }
    const handle = await window.showDirectoryPicker({
      id: "gestor-proyectos",
      mode: "readwrite",
    });
    const ok = await verifyPermission(handle, true);
    if (!ok) throw new StorageError("Permiso de carpeta denegado");
    this.root = handle;
    await idbSet(HANDLE_KEY, handle);
    await this.bootstrap();
  }

  /** Re-grant permission on a stored handle (requires a user gesture). */
  async reconnect(): Promise<boolean> {
    const handle =
      this.root ?? (await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY));
    if (!handle) return false;
    const ok = await verifyPermission(handle, true);
    if (ok) {
      this.root = handle;
      await idbSet(HANDLE_KEY, handle);
      await this.bootstrap();
    }
    return ok;
  }

  private requireRoot(): FileSystemDirectoryHandle {
    if (!this.root) throw new StorageError("Sin carpeta conectada");
    return this.root;
  }

  /** Ensure folder structure and workspace.json exist. */
  private async bootstrap(): Promise<void> {
    const root = this.requireRoot();
    for (const dir of COLLECTION_DIRS) {
      await root.getDirectoryHandle(dir, { create: true });
    }
    for (const dir of Object.values(DOC_DIRS)) {
      await root.getDirectoryHandle(dir, { create: true });
    }
    await root.getDirectoryHandle(".backups", { create: true });
    const exists = await fileExists(root, WORKSPACE_FILE);
    if (!exists) {
      await this.writeWorkspace(emptyWorkspace());
    }
  }

  async readWorkspace(): Promise<Workspace> {
    const root = this.requireRoot();
    const json = await readJsonFile(root, WORKSPACE_FILE);
    const { value, migrated } = await this.migrateOnRead("workspace", json);
    if (migrated) await writeJsonFile(root, WORKSPACE_FILE, value);
    return parseOrThrow(WorkspaceSchema, value, WORKSPACE_FILE);
  }

  async writeWorkspace(ws: Workspace): Promise<void> {
    const root = this.requireRoot();
    const validated = parseOrThrow(WorkspaceSchema, ws, WORKSPACE_FILE);
    await writeJsonFile(root, WORKSPACE_FILE, validated);
  }

  async list(col: Collection): Promise<string[]> {
    const dir = await this.requireRoot().getDirectoryHandle(col, {
      create: true,
    });
    const ids: string[] = [];
    // @ts-expect-error: async iterator is provided at runtime.
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === "file" && name.endsWith(".json")) {
        ids.push(name.replace(/\.json$/, ""));
      }
    }
    return ids;
  }

  async read<T>(col: Collection, id: string): Promise<T> {
    const dir = await this.requireRoot().getDirectoryHandle(col, {
      create: true,
    });
    const json = await readJsonFile(dir, `${id}.json`);
    const { value, migrated } = await this.migrateOnRead(col, json);
    if (migrated) await writeJsonFile(dir, `${id}.json`, value);
    return parseOrThrow(collectionSchema[col], value, `${col}/${id}.json`) as T;
  }

  async write<T extends { id: string }>(col: Collection, data: T): Promise<void> {
    const dir = await this.requireRoot().getDirectoryHandle(col, {
      create: true,
    });
    const validated = parseOrThrow(
      collectionSchema[col],
      data,
      `${col}/${data.id}.json`,
    );
    await writeJsonFile(dir, `${data.id}.json`, validated);
  }

  async remove(col: Collection, id: string): Promise<void> {
    const dir = await this.requireRoot().getDirectoryHandle(col, {
      create: true,
    });
    await dir.removeEntry(`${id}.json`).catch(() => undefined);
  }

  async readDoc<T>(name: DocName): Promise<T> {
    const dir = await this.requireRoot().getDirectoryHandle(DOC_DIRS[name], {
      create: true,
    });
    const file = `${name}.json`;
    if (!(await fileExists(dir, file))) {
      const empty = emptyDoc(name);
      await writeJsonFile(dir, file, empty);
      return empty as T;
    }
    const json = await readJsonFile(dir, file);
    const { value, migrated } = await this.migrateOnRead<Record<string, unknown>>(name, json);
    if (migrated) await writeJsonFile(dir, file, value);
    return value as T;
  }

  async writeDoc<T>(name: DocName, data: T): Promise<void> {
    const dir = await this.requireRoot().getDirectoryHandle(DOC_DIRS[name], {
      create: true,
    });
    await writeJsonFile(dir, `${name}.json`, data);
  }

  async exportAll(): Promise<Blob> {
    const bundle: Record<string, unknown> = {
      workspace: await this.readWorkspace(),
    };
    for (const col of COLLECTION_DIRS) {
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
    for (const col of COLLECTION_DIRS) {
      const items = (bundle[col] as { id: string }[]) ?? [];
      for (const item of items) await this.write(col, item);
    }
    if (bundle.people) await this.writeDoc("people", bundle.people);
    if (bundle.notifications)
      await this.writeDoc("notifications", bundle.notifications);
    if (bundle.activity) await this.writeDoc("activity", bundle.activity);
  }

  async backup(): Promise<void> {
    const root = this.requireRoot();
    const backups = await root.getDirectoryHandle(".backups", { create: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = await backups.getDirectoryHandle(stamp, { create: true });
    const blob = await this.exportAll();
    await writeRaw(dir, "snapshot.json", await blob.text());
  }
}

/* ---------- helpers ---------- */

async function verifyPermission(
  handle: FileSystemHandle,
  request: boolean,
): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await handle.queryPermission?.(opts)) === "granted") return true;
  if (request && (await handle.requestPermission?.(opts)) === "granted")
    return true;
  return false;
}

async function fileExists(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<boolean> {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<unknown> {
  const fileHandle = await dir.getFileHandle(name);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text);
}

async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: unknown,
): Promise<void> {
  await writeRaw(dir, name, JSON.stringify(data, null, 2));
}

async function writeRaw(
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

function parseOrThrow<T>(schema: { parse: (v: unknown) => T }, json: unknown, where: string): T {
  try {
    return schema.parse(json);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new StorageError(`JSON inválido en ${where}: ${err.message}`, err);
    }
    throw err;
  }
}
