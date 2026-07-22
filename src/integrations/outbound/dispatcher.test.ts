import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookSubscription, OutboundDelivery, SyncLog } from "@/storage/integration-db";
import type { EncryptedPayload } from "@/integrations/crypto";
import type { DomainEvent } from "@/automations/events";

// In-memory fakes for the Dexie tables `dispatcher.ts` touches, plus the
// vault. Real `integrationDb` needs IndexedDB, which isn't available in this
// project's Node test environment. `vi.mock` factories are hoisted above these
// declarations, so the mutable state they close over must be created via
// `vi.hoisted`.
const { subscriptions, queue, syncLogs, updates, puts, vaultState } = vi.hoisted(() => ({
  subscriptions: [] as WebhookSubscription[],
  queue: [] as OutboundDelivery[],
  syncLogs: [] as SyncLog[],
  updates: [] as { id: string; changes: Partial<WebhookSubscription> }[],
  puts: [] as WebhookSubscription[],
  vaultState: {
    isUnlocked: true,
    decrypt: vi.fn(async () => "migrated-secret"),
  },
}));

vi.mock("@/storage/integration-db", () => ({
  integrationDb: {
    webhookSubscriptions: {
      toArray: async () => subscriptions,
      update: async (id: string, changes: Partial<WebhookSubscription>) => {
        updates.push({ id, changes });
      },
      put: async (sub: WebhookSubscription) => {
        puts.push(sub);
      },
    },
    outboundQueue: {
      add: async (d: OutboundDelivery) => {
        queue.push(d);
      },
    },
    syncLogs: {
      add: async (log: SyncLog) => {
        syncLogs.push(log);
      },
    },
  },
}));

vi.mock("../vault", () => ({
  useVaultStore: {
    getState: () => vaultState,
  },
}));

import {
  dispatchOutboundEvents,
  migrateWebhookSubscriptionSecrets,
  type OutboundPayload,
} from "./dispatcher";
import { verifyPayloadSignature } from "./signing";

function makeSub(overrides: Partial<WebhookSubscription> = {}): WebhookSubscription {
  return {
    id: "sub-1",
    name: "Test subscription",
    url: "https://example.com/hook",
    secret: "webhook-secret",
    events: ["task.statusChanged"],
    filters: {},
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const taskEvent: DomainEvent = {
  type: "task.statusChanged",
  projectId: "p1",
  taskId: "t1",
  from: "todo",
  to: "done",
};

const encrypted: EncryptedPayload = { ciphertext: "x", iv: "x", salt: "x" };

describe("dispatchOutboundEvents", () => {
  beforeEach(() => {
    subscriptions.length = 0;
    queue.length = 0;
    syncLogs.length = 0;
    updates.length = 0;
    puts.length = 0;
    vaultState.isUnlocked = true;
    vaultState.decrypt.mockClear();
    vaultState.decrypt.mockImplementation(async () => "migrated-secret");
  });

  it("enqueues a delivery for an enabled subscription listening to a matching event", async () => {
    subscriptions.push(makeSub({ enabled: true }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(1);
    expect(queue[0].subscriptionId).toBe("sub-1");
    expect(queue[0].url).toBe("https://example.com/hook");
  });

  it("skips disabled subscriptions (regression: enabled is a boolean, not the number 1)", async () => {
    subscriptions.push(makeSub({ id: "sub-disabled", enabled: false }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(0);
  });

  it("does not enqueue for events the subscription isn't listening to", async () => {
    subscriptions.push(makeSub({ id: "sub-other-events", events: ["project.statusChanged"] }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(0);
  });

  // Spec 034 §B — sin secreto ⇒ webhook limpio, sin firma, pero se encola igual.
  it("enqueues without a signature when the subscription has no secret", async () => {
    subscriptions.push(makeSub({ secret: undefined }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(1);
    expect(queue[0].signature).toBe("");
    expect(syncLogs).toHaveLength(0);
  });

  it("enqueues with a verifiable signature when the subscription has a secret", async () => {
    subscriptions.push(makeSub({ secret: "topsecret" }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(1);
    expect(queue[0].signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    const payload = JSON.parse(queue[0].payload) as OutboundPayload;
    expect(await verifyPayloadSignature(payload, "topsecret", queue[0].signature)).toBe(true);
  });

  // Spec 034 §B — el bug arreglado: no descartar en silencio. `needsReconnect`
  // registra un error en syncLogs y NO encola (no puede firmar).
  it("logs an error (never silently drops) for a needsReconnect subscription", async () => {
    subscriptions.push(makeSub({ id: "sub-broken", secret: undefined, needsReconnect: true }));

    await dispatchOutboundEvents([taskEvent], "Acme");

    expect(queue).toHaveLength(0);
    expect(syncLogs).toHaveLength(1);
    expect(syncLogs[0]).toMatchObject({
      direction: "outbound",
      provider: "webhook",
      status: "error",
      eventType: "task.statusChanged",
    });
    expect(syncLogs[0].errorMessage).toContain("reconfigurar");
  });
});

describe("migrateWebhookSubscriptionSecrets (spec 034 §B)", () => {
  beforeEach(() => {
    subscriptions.length = 0;
    queue.length = 0;
    syncLogs.length = 0;
    updates.length = 0;
    puts.length = 0;
    vaultState.isUnlocked = true;
    vaultState.decrypt.mockClear();
    vaultState.decrypt.mockImplementation(async () => "migrated-secret");
  });

  it("decrypts an encrypted v2 subscription to plaintext when the vault is unlocked", async () => {
    subscriptions.push({
      ...makeSub({ secret: undefined }),
      encryptedSecret: encrypted,
    } as WebhookSubscription);

    await migrateWebhookSubscriptionSecrets();

    expect(vaultState.decrypt).toHaveBeenCalledWith(encrypted);
    expect(puts).toHaveLength(1);
    expect(puts[0].secret).toBe("migrated-secret");
    expect(puts[0].needsReconnect).toBe(false);
    // `put` reescribe la fila sin el `encryptedSecret` viejo.
    expect((puts[0] as WebhookSubscription & { encryptedSecret?: unknown }).encryptedSecret).toBeUndefined();
  });

  it("marks needsReconnect (and keeps the encrypted secret) when the vault is locked", async () => {
    vaultState.isUnlocked = false;
    subscriptions.push({
      ...makeSub({ secret: undefined }),
      encryptedSecret: encrypted,
    } as WebhookSubscription);

    await migrateWebhookSubscriptionSecrets();

    expect(vaultState.decrypt).not.toHaveBeenCalled();
    expect(puts).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0].changes).toEqual({ needsReconnect: true });
  });

  it("is idempotent: skips subscriptions already migrated to a plaintext secret", async () => {
    subscriptions.push(makeSub({ secret: "already-plain" }));

    await migrateWebhookSubscriptionSecrets();

    expect(vaultState.decrypt).not.toHaveBeenCalled();
    expect(puts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("marks needsReconnect when decrypt throws despite an unlocked vault", async () => {
    vaultState.decrypt.mockRejectedValueOnce(new Error("bad key"));
    subscriptions.push({
      ...makeSub({ secret: undefined }),
      encryptedSecret: encrypted,
    } as WebhookSubscription);

    await migrateWebhookSubscriptionSecrets();

    expect(puts).toHaveLength(0);
    expect(updates).toEqual([{ id: "sub-1", changes: { needsReconnect: true } }]);
  });
});
