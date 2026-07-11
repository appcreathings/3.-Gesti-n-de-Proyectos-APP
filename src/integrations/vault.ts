import { create } from "zustand";
import { deriveKey, encryptWithKey, decryptWithKey, exportKeyRaw, importKeyRaw } from "./crypto";
import type { EncryptedPayload } from "./crypto";

const VAULT_SALT_KEY = "hito:vault-salt";
const VAULT_CANARY_KEY = "hito:vault-canary";
const VAULT_PERSIST_MODE_KEY = "hito:vault-persist-mode";
const VAULT_PERSISTED_KEY_KEY = "hito:vault-key";
/** Known plaintext encrypted at setup time, used to verify `unlock()`'s
 * passphrase before trusting the derived key for real secrets. */
const CANARY_PLAINTEXT = "hito-vault-canary-v1";

/** "off" (default): the derived key never leaves memory, matching the
 * previous behavior — re-enter the passphrase after reload/auto-lock.
 * "session": the raw key is exported and stashed in `sessionStorage`,
 * surviving reloads within the same tab, cleared when the tab closes.
 * "always": stashed in `localStorage`, surviving across sessions until the
 * user locks manually. Chosen by the user (spec 023 §A) — trades vault
 * security for fewer passphrase re-entries. */
export type VaultPersistenceMode = "off" | "session" | "always";

function loadSaltFromStorage(): Uint8Array | null {
  const raw = localStorage.getItem(VAULT_SALT_KEY);
  if (!raw) return null;
  return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
}

function saveSaltToStorage(salt: Uint8Array): void {
  localStorage.setItem(VAULT_SALT_KEY, btoa(String.fromCharCode(...salt)));
}

function loadCanaryFromStorage(): EncryptedPayload | null {
  const raw = localStorage.getItem(VAULT_CANARY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedPayload;
  } catch {
    return null;
  }
}

function saveCanaryToStorage(payload: EncryptedPayload): void {
  localStorage.setItem(VAULT_CANARY_KEY, JSON.stringify(payload));
}

function loadPersistenceMode(): VaultPersistenceMode {
  const raw = localStorage.getItem(VAULT_PERSIST_MODE_KEY);
  return raw === "session" || raw === "always" ? raw : "off";
}

function savePersistenceModeToStorage(mode: VaultPersistenceMode): void {
  localStorage.setItem(VAULT_PERSIST_MODE_KEY, mode);
}

function persistedKeyStorage(mode: VaultPersistenceMode): Storage | null {
  if (mode === "session") return sessionStorage;
  if (mode === "always") return localStorage;
  return null;
}

/** Clears the exported key from both storages regardless of the current
 * mode — used on `lock()` and on any persistence-mode change, so a stale
 * key never lingers in a storage that no longer matches the preference. */
function clearPersistedKey(): void {
  sessionStorage.removeItem(VAULT_PERSISTED_KEY_KEY);
  localStorage.removeItem(VAULT_PERSISTED_KEY_KEY);
}

async function persistKey(mode: VaultPersistenceMode, key: CryptoKey): Promise<void> {
  const storage = persistedKeyStorage(mode);
  if (!storage) return;
  const raw = await exportKeyRaw(key);
  storage.setItem(VAULT_PERSISTED_KEY_KEY, raw);
}

function loadPersistedKeyRaw(mode: VaultPersistenceMode): string | null {
  return persistedKeyStorage(mode)?.getItem(VAULT_PERSISTED_KEY_KEY) ?? null;
}

interface VaultState {
  _masterKey: CryptoKey | null;
  _salt: Uint8Array | null;
  isUnlocked: boolean;
  hasMasterPassword: boolean;
  persistenceMode: VaultPersistenceMode;

  unlock(passphrase: string): Promise<boolean>;
  lock(): void;
  setupMasterPassword(passphrase: string): Promise<void>;
  encrypt(data: unknown): Promise<EncryptedPayload>;
  decrypt<T>(enc: EncryptedPayload): Promise<T>;
  /** Changes the persistence preference. Takes effect on the *next*
   * unlock/setup — WebCrypto has no way to make an already-derived
   * non-extractable key extractable retroactively. Always wipes any
   * previously-persisted key first, so switching away from "always"/
   * "session" (including to "off") never leaves a stale key behind. */
  setPersistenceMode(mode: VaultPersistenceMode): void;
  /** Called at app bootstrap: if a key was persisted under the current
   * mode, reimports it and unlocks without asking for the passphrase.
   * Returns whether it actually restored a session. */
  restoreFromPersistence(): Promise<boolean>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  _masterKey: null,
  _salt: null,
  isUnlocked: false,
  hasMasterPassword: loadSaltFromStorage() !== null,
  persistenceMode: loadPersistenceMode(),

  async unlock(passphrase: string): Promise<boolean> {
    const salt = loadSaltFromStorage();
    if (!salt) return false;

    try {
      const { persistenceMode } = get();
      const extractable = persistenceMode !== "off";
      const key = await deriveKey(passphrase, salt, { extractable });

      // `deriveKey` never throws for a wrong passphrase (PBKDF2 always
      // succeeds), so without this check `unlock` would accept any input and
      // only fail later, silently, on the first real `decrypt()`. Verify
      // against a known plaintext encrypted at setup time.
      const canary = loadCanaryFromStorage();
      if (canary) {
        const decrypted = await decryptWithKey<string>(key, canary);
        if (decrypted !== CANARY_PLAINTEXT) return false;
      }
      // Vaults created before this fix have no canary — accept as before;
      // decrypt() will fail later if the passphrase was actually wrong.

      if (extractable) await persistKey(persistenceMode, key);

      set({ _masterKey: key, _salt: salt, isUnlocked: true });
      return true;
    } catch {
      return false;
    }
  },

  lock() {
    clearPersistedKey();
    set({ _masterKey: null, _salt: null, isUnlocked: false });
  },

  async setupMasterPassword(passphrase: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saveSaltToStorage(salt);
    const { persistenceMode } = get();
    const extractable = persistenceMode !== "off";
    const key = await deriveKey(passphrase, salt, { extractable });
    const canary = await encryptWithKey(key, salt, CANARY_PLAINTEXT);
    saveCanaryToStorage(canary);
    if (extractable) await persistKey(persistenceMode, key);
    set({ _masterKey: key, _salt: salt, isUnlocked: true, hasMasterPassword: true });
  },

  async encrypt(data: unknown): Promise<EncryptedPayload> {
    const { _masterKey, _salt } = get();
    if (!_masterKey || !_salt) throw new Error("Vault is locked");
    return encryptWithKey(_masterKey, _salt, data);
  },

  async decrypt<T>(enc: EncryptedPayload): Promise<T> {
    const { _masterKey } = get();
    if (!_masterKey) throw new Error("Vault is locked");
    return decryptWithKey<T>(_masterKey, enc);
  },

  setPersistenceMode(mode: VaultPersistenceMode) {
    savePersistenceModeToStorage(mode);
    clearPersistedKey();
    set({ persistenceMode: mode });
  },

  async restoreFromPersistence(): Promise<boolean> {
    const { persistenceMode } = get();
    if (persistenceMode === "off") return false;

    const salt = loadSaltFromStorage();
    const rawKey = loadPersistedKeyRaw(persistenceMode);
    if (!salt || !rawKey) return false;

    try {
      const key = await importKeyRaw(rawKey);
      set({ _masterKey: key, _salt: salt, isUnlocked: true });
      return true;
    } catch {
      clearPersistedKey();
      return false;
    }
  },
}));
