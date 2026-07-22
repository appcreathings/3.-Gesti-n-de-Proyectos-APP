import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks del mismo patrón que useDataStore.flowFailureNotify.test.ts —
// `runPolledFlowImpl` importa dinámicamente useFlowStore + engine, y
// `applyFlowResult` ahora también importa `@/storage/integration-db` para
// persistir el delivery log (spec 033 A1).
vi.mock("@/store/useFlowStore", () => ({
  useFlowStore: { getState: vi.fn() },
}));
vi.mock("@/flows/engine", () => ({
  runFlowEngine: vi.fn(),
  pollTriggerKey: (trigger: { provider: string; config?: { connectionId?: string; objectType?: string } }) =>
    trigger.provider === "google-sheets"
      ? `google-sheets:${trigger.config?.connectionId}`
      : `hubspot:${trigger.config?.connectionId}:${trigger.config?.objectType ?? "contacts"}`,
}));
vi.mock("@/store/useAppStore", () => ({
  useAppStore: { getState: vi.fn(() => ({ adapter: { writeDoc: vi.fn() } })) },
}));

const syncLogsAdd = vi.fn().mockResolvedValue(undefined);
vi.mock("@/storage/integration-db", () => ({
  integrationDb: { syncLogs: { add: syncLogsAdd } },
}));

const { useDataStore } = await import("@/store/useDataStore");
const { useFlowStore } = await import("@/store/useFlowStore");
const { runFlowEngine } = await import("@/flows/engine");

const mockedFlowStoreGetState = vi.mocked(useFlowStore.getState);
const mockedRunFlowEngine = vi.mocked(runFlowEngine);

function makeFlow(overrides: Partial<import("@/domain/schemas/flow").FlowRule> = {}) {
  const now = new Date().toISOString();
  return {
    id: "flow-delivery",
    schemaVersion: 16,
    name: "Flow con webhook",
    enabled: true,
    notifyOnFailure: true,
    trigger: {
      type: "poll" as const,
      provider: "hubspot" as const,
      config: { connectionId: "c1", objectType: "contacts" as const, fields: [], filters: [], intervalMs: 300000 },
    },
    logic: { conditions: [], mapping: [] },
    outputs: [{ type: "webhook" as const, url: "https://hook.example/x", secret: "should-not-leak" }],
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("applyFlowResult — delivery log durable (spec 033 A1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataStore.setState({ notifications: [] });
  });

  it("persists an outbound webhook delivery to syncLogs with the secret masked + runId linked", async () => {
    const flow = makeFlow();
    const recordRuns = vi.fn();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns,
    } as never);
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [
        {
          url: "https://hook.example/x",
          secret: "should-not-leak",
          payload: { name: "ACME", token: "pat-na1-real" },
          status: 200,
          responseSnippet: '{"ok":true}',
          attempts: 1,
          flowId: flow.id,
          outputIndex: 0,
          data: { name: "ACME" },
        },
      ],
      emailDeliveries: [],
      executedFlowIds: [flow.id],
      errors: [],
      traces: {},
    });

    await useDataStore.getState().runPolledFlow("hubspot:c1:contacts", [{ id: "1" }]);

    expect(syncLogsAdd).toHaveBeenCalledTimes(1);
    const logged = syncLogsAdd.mock.calls[0][0] as Record<string, unknown>;
    expect(logged.direction).toBe("outbound");
    expect(logged.provider).toBe("webhook");
    expect(logged.flowId).toBe(flow.id);
    expect(logged.outputIndex).toBe(0);
    expect(logged.httpStatus).toBe(200);
    // El secret de firma NUNCA llega al log durable.
    const serialized = JSON.stringify(logged);
    expect(serialized).not.toContain("should-not-leak");
    // El token dentro del payload queda enmascarado.
    expect(logged.requestPayload).toContain("••••");
    expect(logged.requestPayload).not.toContain("pat-na1-real");
    // El runId queda vinculado al run registrado.
    const recordedRun = recordRuns.mock.calls[0][0][0] as { id: string };
    expect(logged.runId).toBe(recordedRun.id);
  });

  it("persists a failed delivery (error/network) as status:error with the message", async () => {
    const flow = makeFlow();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [
        {
          url: "https://hook.example/x",
          secret: "s",
          payload: {},
          status: null,
          error: "Entrega fallida: TypeError: fetch failed",
          attempts: 2,
          flowId: flow.id,
          outputIndex: 0,
          data: {},
        },
      ],
      emailDeliveries: [],
      executedFlowIds: [],
      errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "Entrega fallida: TypeError: fetch failed" }],
      traces: {},
    });

    await useDataStore.getState().runPolledFlow("hubspot:c1:contacts", [{ id: "1" }]);

    expect(syncLogsAdd).toHaveBeenCalledTimes(1);
    const logged = syncLogsAdd.mock.calls[0][0] as Record<string, unknown>;
    expect(logged.status).toBe("error");
    expect(logged.httpStatus).toBeNull();
    expect(logged.errorMessage).toBe("Entrega fallida: TypeError: fetch failed");
    expect(logged.retryCount).toBe(1); // attempts=2 → 1 reintento
  });

  it("does NOT log email deliveries in applyFlowResult (sendEmailViaAppsScript already logs them)", async () => {
    const flow = makeFlow();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [],
      emailDeliveries: [{ proxyUrl: "https://x", to: "a@b.com", subject: "s", body: "secret-body" }],
      executedFlowIds: [flow.id],
      errors: [],
      traces: {},
    });

    await useDataStore.getState().runPolledFlow("hubspot:c1:contacts", [{ id: "1" }]);

    // Solo se loguean outboundDeliveries (webhook); email ya se loguea por su
    // cuenta en sendEmailViaAppsScript, no se duplica.
    expect(syncLogsAdd).not.toHaveBeenCalled();
  });
});

describe("applyFlowResult — failure notification deep-link (spec 033 C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataStore.setState({ notifications: [] });
  });

  it("the failure notification carries entityRef kind:flow + runId matching the recorded run", async () => {
    // Id distinto al resto del archivo: el cooldown de notificación de fallo
    // vive en un Map a nivel de módulo que no se resetea entre tests.
    const flow = makeFlow({ id: "flow-deeplink" });
    const recordRuns = vi.fn();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns,
    } as never);
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [],
      emailDeliveries: [],
      executedFlowIds: [],
      errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      traces: {},
    });

    await useDataStore.getState().runPolledFlow("hubspot:c1:contacts", [{ id: "1" }]);

    const notifications = useDataStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    const n = notifications[0];
    expect(n.entityRef?.kind).toBe("flow");
    expect(n.entityRef?.id).toBe(flow.id);
    // El runId debe coincidir con el id del run registrado (deep-link).
    const recordedRun = recordRuns.mock.calls[0][0][0] as { id: string };
    expect(n.entityRef?.runId).toBe(recordedRun.id);
  });
});
