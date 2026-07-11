import { describe, it, expect, beforeEach } from "vitest";

// `vault.ts` reads/writes `localStorage`/`sessionStorage` at module scope
// (`hasMasterPassword`/`persistenceMode` init) and on every setup/unlock
// call. The Node test environment has neither global, so provide minimal
// in-memory ones *before* the module is ever imported — hence the dynamic
// `await import` in each test instead of a static top-level import.
function makeStorage(backing: Map<string, string>): Storage {
  return {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => {
      backing.set(k, v);
    },
    removeItem: (k: string) => {
      backing.delete(k);
    },
    clear: () => backing.clear(),
    key: (i: number) => Array.from(backing.keys())[i] ?? null,
    get length() {
      return backing.size;
    },
  } as Storage;
}

const localBacking = new Map<string, string>();
const sessionBacking = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: makeStorage(localBacking),
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  writable: true,
  value: makeStorage(sessionBacking),
});

describe("vault", () => {
  beforeEach(() => {
    localBacking.clear();
    sessionBacking.clear();
  });

  it("round-trips setup -> lock -> unlock -> decrypt", async () => {
    const { useVaultStore } = await import("./vault");

    await useVaultStore.getState().setupMasterPassword("correct horse battery staple");
    const enc = await useVaultStore.getState().encrypt({ hello: "world" });

    useVaultStore.getState().lock();
    expect(useVaultStore.getState().isUnlocked).toBe(false);

    const ok = await useVaultStore.getState().unlock("correct horse battery staple");
    expect(ok).toBe(true);
    expect(useVaultStore.getState().isUnlocked).toBe(true);

    const decrypted = await useVaultStore.getState().decrypt<{ hello: string }>(enc);
    expect(decrypted.hello).toBe("world");
  });

  it("rejects an incorrect passphrase instead of silently accepting it (canary check)", async () => {
    const { useVaultStore } = await import("./vault");

    await useVaultStore.getState().setupMasterPassword("correct horse battery staple");
    useVaultStore.getState().lock();

    const ok = await useVaultStore.getState().unlock("totally wrong password");

    expect(ok).toBe(false);
    expect(useVaultStore.getState().isUnlocked).toBe(false);
  });

  it("rejects unlock() when no vault has been set up (no salt in storage)", async () => {
    const { useVaultStore } = await import("./vault");

    const ok = await useVaultStore.getState().unlock("anything");

    expect(ok).toBe(false);
  });

  it("lock() clears the in-memory key so encrypt/decrypt throw", async () => {
    const { useVaultStore } = await import("./vault");

    await useVaultStore.getState().setupMasterPassword("pw");
    useVaultStore.getState().lock();

    await expect(useVaultStore.getState().encrypt("x")).rejects.toThrow();
  });

  it("persistenceMode 'off' (default) never writes a key to session/localStorage", async () => {
    const { useVaultStore } = await import("./vault");

    await useVaultStore.getState().setupMasterPassword("pw");

    expect(sessionBacking.get("hito:vault-key")).toBeUndefined();
    expect(localBacking.get("hito:vault-key")).toBeUndefined();
  });

  it("persistenceMode 'session' persists the key to sessionStorage on setup, and lock() clears it", async () => {
    const { useVaultStore } = await import("./vault");

    useVaultStore.getState().setPersistenceMode("session");
    await useVaultStore.getState().setupMasterPassword("pw");

    expect(sessionBacking.get("hito:vault-key")).toBeTruthy();

    useVaultStore.getState().lock();
    expect(sessionBacking.get("hito:vault-key")).toBeUndefined();
  });

  it("persistenceMode 'always' persists the key to localStorage on unlock", async () => {
    const { useVaultStore } = await import("./vault");

    useVaultStore.getState().setPersistenceMode("always");
    await useVaultStore.getState().setupMasterPassword("pw");
    useVaultStore.getState().lock();
    // lock() clears the persisted key too — re-derive via unlock to persist again.
    const ok = await useVaultStore.getState().unlock("pw");

    expect(ok).toBe(true);
    expect(localBacking.get("hito:vault-key")).toBeTruthy();
  });

  it("restoreFromPersistence() reimports a persisted key and unlocks without a passphrase", async () => {
    const { useVaultStore } = await import("./vault");

    useVaultStore.getState().setPersistenceMode("always");
    const enc = await (async () => {
      await useVaultStore.getState().setupMasterPassword("pw");
      return useVaultStore.getState().encrypt({ hello: "world" });
    })();

    // Simulate a fresh page load: reset in-memory state but keep storage.
    useVaultStore.setState({ _masterKey: null, _salt: null, isUnlocked: false });

    const restored = await useVaultStore.getState().restoreFromPersistence();
    expect(restored).toBe(true);
    expect(useVaultStore.getState().isUnlocked).toBe(true);

    const decrypted = await useVaultStore.getState().decrypt<{ hello: string }>(enc);
    expect(decrypted.hello).toBe("world");
  });

  it("restoreFromPersistence() is a no-op when persistenceMode is 'off'", async () => {
    const { useVaultStore } = await import("./vault");

    useVaultStore.getState().setPersistenceMode("off");
    await useVaultStore.getState().setupMasterPassword("pw");
    useVaultStore.setState({ _masterKey: null, _salt: null, isUnlocked: false });

    const restored = await useVaultStore.getState().restoreFromPersistence();
    expect(restored).toBe(false);
    expect(useVaultStore.getState().isUnlocked).toBe(false);
  });

  it("setPersistenceMode() wipes any previously-persisted key from both storages", async () => {
    const { useVaultStore } = await import("./vault");

    useVaultStore.getState().setPersistenceMode("always");
    await useVaultStore.getState().setupMasterPassword("pw");
    expect(localBacking.get("hito:vault-key")).toBeTruthy();

    useVaultStore.getState().setPersistenceMode("off");
    expect(localBacking.get("hito:vault-key")).toBeUndefined();
    expect(sessionBacking.get("hito:vault-key")).toBeUndefined();
  });
});
