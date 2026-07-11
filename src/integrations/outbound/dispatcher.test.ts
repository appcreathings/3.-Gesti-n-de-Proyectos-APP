import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookSubscription, OutboundDelivery } from "@/storage/integration-db";
import type { DomainEvent } from "@/automations/events";

// In-memory fakes for the two Dexie tables `dispatcher.ts` touches, plus the
// vault's decrypt. Real `integrationDb` needs IndexedDB, which isn't
// available in this project's Node test environment. `vi.mock` factories are
// hoisted above these declarations, so the mutable state they close over
// must itself be created via `vi.hoisted`.
const { subscriptions, queue, decrypt } = vi.hoisted(() => ({
  subscriptions: [] as WebhookSubscription[],
  queue: [] as OutboundDelivery[],
  decrypt: vi.fn(async () => "webhook-secret"),
}));

vi.mock("@/storage/integration-db", () => ({
  integrationDb: {
    webhookSubscriptions: {
      toArray: async () => subscriptions,
    },
    outboundQueue: {
      add: async (d: OutboundDelivery) => {
        queue.push(d);
      },
    },
  },
}));

vi.mock("../vault", () => ({
  useVaultStore: {
    getState: () => ({ decrypt }),
  },
}));

import { dispatchOutboundEvents } from "./dispatcher";

function makeSub(overrides: Partial<WebhookSubscription> = {}): WebhookSubscription {
  return {
    id: "sub-1",
    name: "Test subscription",
    url: "https://example.com/hook",
    encryptedSecret: { ciphertext: "x", iv: "x", salt: "x" },
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

describe("dispatchOutboundEvents", () => {
  beforeEach(() => {
    subscriptions.length = 0;
    queue.length = 0;
    decrypt.mockClear();
    decrypt.mockImplementation(async () => "webhook-secret");
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

  it("skips (without throwing) a subscription whose secret fails to decrypt", async () => {
    decrypt.mockRejectedValueOnce(new Error("bad secret"));
    subscriptions.push(makeSub({ id: "sub-broken" }));

    await expect(dispatchOutboundEvents([taskEvent], "Acme")).resolves.not.toThrow();

    expect(queue).toHaveLength(0);
  });
});
