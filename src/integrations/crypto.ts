const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  options?: { extractable?: boolean }
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    options?.extractable ?? false,
    ["encrypt", "decrypt"]
  );
}

/** Exports a key derived with `{ extractable: true }` to a portable string,
 * so it can be stashed in `sessionStorage`/`localStorage` for vault
 * persistence (spec 023 §A). Never call this with a non-extractable key. */
export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Reimports a key produced by `exportKeyRaw`. The resulting key is
 * non-extractable — it's only ever used for encrypt/decrypt after this. */
export async function importKeyRaw(raw: string): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    bytes.buffer as ArrayBuffer,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(
  passphrase: string,
  payload: unknown
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const buffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(buffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function decryptPayload<T>(
  passphrase: string,
  encrypted: EncryptedPayload
): Promise<T> {
  const salt = Uint8Array.from(atob(encrypted.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));
  const key = await deriveKey(passphrase, salt);

  const buffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}

export async function encryptWithKey(
  key: CryptoKey,
  salt: Uint8Array,
  payload: unknown
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const buffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(buffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function decryptWithKey<T>(
  key: CryptoKey,
  encrypted: EncryptedPayload
): Promise<T> {
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const buffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}
