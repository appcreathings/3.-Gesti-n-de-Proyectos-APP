import { describe, it, expect, vi, beforeEach } from "vitest";

// Same dynamic-import mocking pattern as `useDataStore.runFlowNow.test.ts` —
// `runPolledFlowImpl`/`runFlowNowImpl` both dynamically import these two
// modules. `useAppStore` is also mocked because a failure notification is
// persisted via `adapter().writeDoc("notifications", ...)`.
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

const { useDataStore } = await import("@/store/useDataStore");
const { useFlowStore } = await import("@/store/useFlowStore");
const { runFlowEngine } = await import("@/flows/engine");

const mockedFlowStoreGetState = vi.mocked(useFlowStore.getState);
const mockedRunFlowEngine = vi.mocked(runFlowEngine);

function makeFlow(overrides: Partial<import("@/domain/schemas/flow").FlowRule> = {}) {
  const now = new Date().toISOString();
  return {
    id: "flow-1",
    schemaVersion: 11,
    name: "Test flow",
    enabled: true,
    notifyOnFailure: true,
    trigger: {
      type: "poll" as const,
      provider: "hubspot" as const,
      config: {
        connectionId: "conn-1",
        objectType: "contacts" as const,
        fields: [],
        filters: [],
        intervalMs: 300000,
      },
    },
    logic: { conditions: [], mapping: [] },
    outputs: [],
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function baseEngineResult(overrides: Partial<import("@/flows/engine").FlowEngineResult> = {}) {
  return {
    changedProjects: [],
    newProjects: [],
    newPeople: [],
    updatedPeople: [],
    notifications: [],
    outboundDeliveries: [],
    emailDeliveries: [],
    executedFlowIds: [],
    errors: [],
    traces: {},
    ...overrides,
  };
}

describe("automatic flow failure notifications (spec 024 §F3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataStore.setState({ notifications: [] });
  });

  it("notifies when an enabled flow's automatic poll run errors outright", async () => {
    const flow = makeFlow({ id: "flow-notify-error" });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);

    const notifications = useDataStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].severity).toBe("critical");
    expect(notifications[0].message).toContain(flow.name);
    expect(notifications[0].type).toBe("flow.failed");
  });

  it("notifies with 'warning' severity for a partial run (some outputs succeeded, some failed)", async () => {
    const flow = makeFlow({ id: "flow-notify-partial" });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        executedFlowIds: [flow.id],
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);

    const notifications = useDataStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].severity).toBe("warning");
  });

  it("does not notify when the flow is disabled", async () => {
    const flow = makeFlow({ id: "flow-disabled", enabled: false });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);

    expect(useDataStore.getState().notifications).toHaveLength(0);
  });

  it("does not notify when the flow opted out via notifyOnFailure: false", async () => {
    const flow = makeFlow({ id: "flow-opt-out", notifyOnFailure: false });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);

    expect(useDataStore.getState().notifications).toHaveLength(0);
  });

  it("does not send a second failure notification for the same flow within the cooldown window", async () => {
    const flow = makeFlow({ id: "flow-cooldown" });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);
    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "2" }]);

    // Dos corridas fallidas seguidas del mismo flow → solo una notificación.
    expect(useDataStore.getState().notifications).toHaveLength(1);
  });

  it("does not notify for a flow that succeeds", async () => {
    const flow = makeFlow({ id: "flow-success" });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(baseEngineResult({ executedFlowIds: [flow.id] }));

    await useDataStore.getState().runPolledFlow("hubspot:conn-1:contacts", [{ id: "1" }]);

    expect(useDataStore.getState().notifications).toHaveLength(0);
  });
});

describe("manual 'Ejecutar ahora' never notifies on failure (spec 024 §F3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataStore.setState({ notifications: [] });
  });

  it("does not notify even when a manually-run enabled flow fails", async () => {
    const flow = makeFlow({
      id: "flow-manual-fail",
      trigger: { type: "event", event: "task.added" },
    });
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedRunFlowEngine.mockResolvedValue(
      baseEngineResult({
        errors: [{ flowId: flow.id, flowName: flow.name, stage: "output", message: "boom" }],
      }),
    );

    await useDataStore
      .getState()
      .runFlowNow(flow.id, { syntheticEvent: { type: "task.added", projectId: "p", taskId: "t" } });

    expect(useDataStore.getState().notifications).toHaveLength(0);
  });
});
