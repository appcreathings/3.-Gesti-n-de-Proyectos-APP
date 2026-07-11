import { describe, it, expect } from "vitest";
import {
  encryptPayload,
  decryptPayload,
  deriveKey,
  exportKeyRaw,
  importKeyRaw,
  encryptWithKey,
  decryptWithKey,
} from "./crypto";

describe("crypto", () => {
  const passphrase = "test-passphrase-123";

  it("encrypts and decrypts payload correctly", async () => {
    const payload = { apiKey: "secret-key-123", userId: "user-456" };
    
    const encrypted = await encryptPayload(passphrase, payload);
    
    expect(encrypted).toHaveProperty("ciphertext");
    expect(encrypted).toHaveProperty("iv");
    expect(encrypted).toHaveProperty("salt");
    
    const decrypted = await decryptPayload<typeof payload>(passphrase, encrypted);
    expect(decrypted).toEqual(payload);
  });

  it("produces different ciphertext for same payload (random IV)", async () => {
    const payload = { data: "test" };
    
    const encrypted1 = await encryptPayload(passphrase, payload);
    const encrypted2 = await encryptPayload(passphrase, payload);
    
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it("fails to decrypt with wrong passphrase", async () => {
    const payload = { secret: "data" };
    const encrypted = await encryptPayload(passphrase, payload);
    
    await expect(
      decryptPayload("wrong-passphrase", encrypted)
    ).rejects.toThrow();
  });

  it("handles complex nested objects", async () => {
    const payload = {
      user: { name: "John", email: "john@example.com" },
      settings: { theme: "dark", notifications: true },
      tags: ["admin", "premium"],
    };
    
    const encrypted = await encryptPayload(passphrase, payload);
    const decrypted = await decryptPayload<typeof payload>(passphrase, encrypted);

    expect(decrypted).toEqual(payload);
  });

  it("derives a non-extractable key by default (extractKey throws)", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt);

    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("derives an extractable key when requested, and it round-trips via exportKeyRaw/importKeyRaw", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt, { extractable: true });

    const raw = await exportKeyRaw(key);
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(0);

    const reimported = await importKeyRaw(raw);
    const payload = { hello: "world" };
    const encrypted = await encryptWithKey(key, salt, payload);
    const decrypted = await decryptWithKey<typeof payload>(reimported, encrypted);

    expect(decrypted).toEqual(payload);
  });
});
