import { describe, it, expect, vi, beforeEach } from "vitest";

// `useDataStore.ts` dynamically imports `./useFlowStore`, `@/flows/engine`
// and `@/flows/manual-run` inside `runFlowNowImpl` — mock all three so this
// test never touches real pollers, the vault, or storage.
vi.mock("@/store/useFlowStore", () => ({
  useFlowStore: { getState: vi.fn() },
}));
vi.mock("@/flows/engine", () => ({
  runFlowEngine: vi.fn(),
  pollTriggerKey: (trigger: { provider: string; config?: { objectType?: string } }) =>
    trigger.provider === "google-sheets"
      ? "google-sheets"
      : trigger.config?.objectType && trigger.config.objectType !== "contacts"
        ? `hubspot-${trigger.config.objectType}`
        : "hubspot",
}));
vi.mock("@/flows/manual-run", () => ({
  fetchPollSampleForFlow: vi.fn(),
}));

const { useDataStore } = await import("@/store/useDataStore");
const { useFlowStore } = await import("@/store/useFlowStore");
const { runFlowEngine } = await import("@/flows/engine");
const { fetchPollSampleForFlow } = await import("@/flows/manual-run");

const mockedFlowStoreGetState = vi.mocked(useFlowStore.getState);
const mockedRunFlowEngine = vi.mocked(runFlowEngine);
const mockedFetchPollSample = vi.mocked(fetchPollSampleForFlow);

function makeFlow(overrides: Partial<import("@/domain/schemas/flow").FlowRule> = {}) {
  const now = new Date().toISOString();
  return {
    id: "flow-1",
    schemaVersion: 8,
    name: "Test flow",
    enabled: false, // a manual run must work even when disabled
    trigger: {
      type: "poll" as const,
      provider: "hubspot" as const,
      config: {
        connectionId: "conn-1",
        objectType: "deals" as const,
        fields: [],
        filters: [],
        intervalMs: 300000,
      },
    },
    logic: { conditions: [], mapping: [] },
    outputs: [{ type: "createNotification" as const, severity: "info" as const, message: "hi" }],
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("useDataStore.runFlowNow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs even when the stored flow is disabled (forces enabled:true transiently)", async () => {
    const flow = makeFlow({ enabled: false });
    const otherFlow = makeFlow({ id: "flow-2", name: "Other flow" });

    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow, otherFlow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedFetchPollSample.mockResolvedValue({ ok: true, records: [{ id: "1", dealname: "Acme" }] });
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [],
      emailDeliveries: [],
      executedFlowIds: [flow.id],
      errors: [],
      traces: {},
    });

    const outcome = await useDataStore.getState().runFlowNow(flow.id);

    expect(outcome.success).toBe(true);
    expect(mockedRunFlowEngine).toHaveBeenCalledTimes(1);
    const engineInput = mockedRunFlowEngine.mock.calls[0][0];
    expect(engineInput.flows[0].enabled).toBe(true);
    // spec 023 §F: every run requests tracing so the history is debuggable.
    expect(engineInput.trace).toBe(true);
  });

  it("attaches the engine's trace/preview for this flow to the recorded run log (spec 023 §F)", async () => {
    const flow = makeFlow({ enabled: true });
    const recordRuns = vi.fn();

    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns,
    } as never);
    mockedFetchPollSample.mockResolvedValue({ ok: true, records: [{ id: "1", dealname: "Acme" }] });

    const trace = {
      triggerMatched: true as const,
      recordCount: 1,
      records: [
        {
          record: { id: "1", dealname: "Acme" },
          conditions: [],
          conditionsPassed: true,
          outputs: [{ type: "createNotification" as const, outcome: "executed" as const, mutatedProjectIds: [] }],
        },
      ],
    };
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [],
      emailDeliveries: [],
      executedFlowIds: [flow.id],
      errors: [],
      traces: { [flow.id]: trace },
    });

    await useDataStore.getState().runFlowNow(flow.id);

    expect(recordRuns).toHaveBeenCalledTimes(1);
    const [loggedRun] = recordRuns.mock.calls[0][0];
    expect(loggedRun.trace).toEqual(trace);
    expect(loggedRun.preview).toEqual({ id: "1", dealname: "Acme" });
  });

  it("only runs the requested flow — never other flows sharing the same poll key/connection", async () => {
    const flow = makeFlow({ id: "flow-1", enabled: true });
    const siblingFlow = makeFlow({ id: "flow-2", name: "Sibling", enabled: true }); // same trigger shape/connection

    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow, siblingFlow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedFetchPollSample.mockResolvedValue({ ok: true, records: [{ id: "1" }] });
    mockedRunFlowEngine.mockResolvedValue({
      changedProjects: [],
      newProjects: [],
      newPeople: [],
      updatedPeople: [],
      notifications: [],
      outboundDeliveries: [],
      emailDeliveries: [],
      executedFlowIds: [flow.id],
      errors: [],
      traces: {},
    });

    await useDataStore.getState().runFlowNow(flow.id);

    const engineInput = mockedRunFlowEngine.mock.calls[0][0];
    expect(engineInput.flows).toHaveLength(1);
    expect(engineInput.flows[0].id).toBe(flow.id);
  });

  it("fetches with the flow's poll trigger and builds externalData under the matching key", async () => {
    const flow = makeFlow();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);
    mockedFetchPollSample.mockResolvedValue({ ok: true, records: [{ id: "1" }] });
    mockedRunFlowEngine.mockResolvedValue({
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
    });

    await useDataStore.getState().runFlowNow(flow.id);

    expect(mockedFetchPollSample).toHaveBeenCalledWith(flow.trigger);
    const engineInput = mockedRunFlowEngine.mock.calls[0][0];
    expect(engineInput.externalData?.get("hubspot-deals")).toEqual([{ id: "1" }]);
  });

  it("returns a clear message AND records it in the flow's history when the connection fetch fails before reaching the engine", async () => {
    const flow = makeFlow();
    const recordRuns = vi.fn();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns,
    } as never);
    mockedFetchPollSample.mockResolvedValue({ ok: false, error: "CORS bloqueado" });

    const outcome = await useDataStore.getState().runFlowNow(flow.id);

    expect(outcome.success).toBe(false);
    expect(outcome.message).toContain("CORS bloqueado");
    expect(mockedRunFlowEngine).not.toHaveBeenCalled();
    // Sin esto, un fallo temprano nunca aparecía en el panel de Historial de
    // FlowsPage — el usuario no tenía ninguna pista de qué pasó.
    expect(recordRuns).toHaveBeenCalledWith([
      expect.objectContaining({ flowId: flow.id, status: "error" }),
    ]);
  });

  it("returns not-found for an unknown flow id without touching the engine", async () => {
    mockedFlowStoreGetState.mockReturnValue({
      flows: [],
      incrementRunCount: vi.fn(),
      recordRuns: vi.fn(),
    } as never);

    const outcome = await useDataStore.getState().runFlowNow("missing-id");

    expect(outcome.success).toBe(false);
    expect(mockedRunFlowEngine).not.toHaveBeenCalled();
  });

  it("event-triggered flow: runs the engine with the given syntheticEvent, no externalData, even when disabled", async () => {
    const flow = makeFlow({
      enabled: false,
      trigger: { type: "event", event: "task.statusChanged" },
    });
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
      emailDeliveries: [],
      executedFlowIds: [flow.id],
      errors: [],
      traces: {},
    });

    const syntheticEvent = {
      type: "task.statusChanged" as const,
      projectId: "proj-1",
      taskId: "task-1",
      from: "doing",
      to: "doing",
    };
    const outcome = await useDataStore.getState().runFlowNow(flow.id, { syntheticEvent });

    expect(outcome.success).toBe(true);
    expect(mockedFetchPollSample).not.toHaveBeenCalled();
    const engineInput = mockedRunFlowEngine.mock.calls[0][0];
    expect(engineInput.events).toEqual([syntheticEvent]);
    expect(engineInput.flows).toEqual([{ ...flow, enabled: true }]);
    expect(engineInput.externalData).toBeUndefined();
  });

  it("event-triggered flow: returns a clear message (and records it) when no syntheticEvent is provided", async () => {
    const flow = makeFlow({ trigger: { type: "event", event: "task.added" } });
    const recordRuns = vi.fn();
    mockedFlowStoreGetState.mockReturnValue({
      flows: [flow],
      incrementRunCount: vi.fn(),
      recordRuns,
    } as never);

    const outcome = await useDataStore.getState().runFlowNow(flow.id);

    expect(outcome.success).toBe(false);
    expect(mockedRunFlowEngine).not.toHaveBeenCalled();
    expect(recordRuns).toHaveBeenCalledWith([expect.objectContaining({ flowId: flow.id, status: "error" })]);
  });

  it("records to history even when the flow ran without error but executed nothing (0 outputs / conditions filtered everything)", async () => {
    const flow = makeFlow({ outputs: [], trigger: { type: "event", event: "task.added" } });
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
      executedFlowIds: [], // no outputs ran — `applyFlowResult` alone would log nothing
      errors: [],
      traces: {},
    });

    const outcome = await useDataStore
      .getState()
      .runFlowNow(flow.id, { syntheticEvent: { type: "task.added", projectId: "p", taskId: "t" } });

    expect(outcome.success).toBe(true);
    expect(outcome.message).toContain("no tiene ninguna acción configurada");
    // Sin este `recordOutcome`, este desenlace no caía en `errors` ni en
    // `executedFlowIds`, así que `applyFlowResult` nunca lo registraba —
    // el usuario veía "Historial (0)" tras un click real en "Ejecutar ahora".
    expect(recordRuns).toHaveBeenCalledWith([
      expect.objectContaining({ flowId: flow.id, status: "success" }),
    ]);
  });

  it("records a single 'partial' entry (not separate success + error) when a run has both executed outputs and errors (spec 024 §F2)", async () => {
    const flow = makeFlow({ trigger: { type: "event", event: "task.added" } });
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
      executedFlowIds: [flow.id], // el output "createNotification" corrió...
      errors: [
        { flowId: flow.id, flowName: flow.name, stage: "output", message: "Entrega fallida: fetch failed" },
      ], // ...pero el webhook de otro registro/output falló
      traces: {},
    });

    await useDataStore
      .getState()
      .runFlowNow(flow.id, { syntheticEvent: { type: "task.added", projectId: "p", taskId: "t" } });

    // Antes de este fix, `applyFlowResult` empujaba una entrada "success" (por
    // `executedFlowIds`) y otra "error" (por `errors`) para la misma corrida.
    expect(recordRuns).toHaveBeenCalledTimes(1);
    const [loggedRuns] = recordRuns.mock.calls[0];
    expect(loggedRuns).toHaveLength(1);
    expect(loggedRuns[0]).toEqual(
      expect.objectContaining({ flowId: flow.id, status: "partial" })
    );
    expect(loggedRuns[0].detail).toContain("Entrega fallida");
  });
});
