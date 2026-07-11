import { create } from "zustand";
import type { Settings, Workspace } from "@/domain/schemas";
import { createStorageAdapter, type StorageAdapter } from "@/storage";
import { idbGet } from "@/storage/idb";

export type ConnectionState =
  | "initializing"
  | "needs-folder" // no folder chosen yet (filesystem)
  | "needs-reconnect" // handle stored but permission must be re-granted
  | "ready"
  | "error";

interface AppState {
  adapter: StorageAdapter;
  connection: ConnectionState;
  error: string | null;
  workspace: Workspace | null;

  bootstrap: () => Promise<void>;
  connectFolder: () => Promise<void>;
  reconnectFolder: () => Promise<void>;
  changeFolder: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  updateOrg: (name: string) => Promise<void>;
}

const adapter = createStorageAdapter();

export const useAppStore = create<AppState>((set, get) => ({
  adapter,
  connection: "initializing",
  error: null,
  workspace: null,

  async bootstrap() {
    try {
      await adapter.init();
      if (adapter.isReady()) {
        const workspace = await adapter.readWorkspace();
        set({ workspace, connection: "ready", error: null });
      } else if (adapter.kind === "filesystem") {
        // Could be a fresh start or a stored handle awaiting re-grant.
        const stored = await hasStoredHandle();
        set({ connection: stored ? "needs-reconnect" : "needs-folder" });
      } else {
        set({ connection: "needs-folder" });
      }
    } catch (e) {
      set({ connection: "error", error: errMsg(e) });
    }
  },

  async connectFolder() {
    try {
      await adapter.connect();
      const workspace = await adapter.readWorkspace();
      set({ workspace, connection: "ready", error: null });
    } catch (e) {
      set({ error: errMsg(e) });
    }
  },

  async reconnectFolder() {
    try {
      const ok = await adapter.reconnect();
      if (ok) {
        const workspace = await adapter.readWorkspace();
        set({ workspace, connection: "ready", error: null });
      } else {
        set({ error: "No se pudo reconectar la carpeta" });
      }
    } catch (e) {
      set({ error: errMsg(e) });
    }
  },

  async changeFolder() {
    try {
      await adapter.changeFolder();
      const workspace = await adapter.readWorkspace();
      set({ workspace, connection: "ready", error: null });
    } catch (e) {
      set({ error: errMsg(e) });
    }
  },

  async refreshWorkspace() {
    const workspace = await get().adapter.readWorkspace();
    set({ workspace });
  },

  async updateSettings(patch) {
    const ws = get().workspace;
    if (!ws) return;
    const next: Workspace = {
      ...ws,
      settings: { ...ws.settings, ...patch },
    };
    await get().adapter.writeWorkspace(next);
    set({ workspace: next });
  },

  async updateOrg(name) {
    const ws = get().workspace;
    if (!ws) return;
    const next: Workspace = { ...ws, org: { ...ws.org, name } };
    await get().adapter.writeWorkspace(next);
    set({ workspace: next });
  },
}));

async function hasStoredHandle(): Promise<boolean> {
  try {
    return (await idbGet("rootDirHandle")) != null;
  } catch {
    return false;
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
