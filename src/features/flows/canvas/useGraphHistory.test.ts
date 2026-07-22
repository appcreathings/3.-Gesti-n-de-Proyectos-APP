import { describe, it, expect } from "vitest";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  samePositions,
  snapshotNodes,
  type HistoryState,
} from "./useGraphHistory";
import type { CanvasNode } from "./nodeTypes";

const empty = <T>(): HistoryState<T> => ({ past: [], future: [] });

/** El historial es genérico: para la lógica pura alcanza con strings como
 * "snapshot" — lo que se prueba es el apilado, no la forma del grafo. */
describe("pushHistory (spec 038 §C2/§C3)", () => {
  it("apila el estado previo con su etiqueta", () => {
    const state = pushHistory(empty<string>(), { label: "Borrar nodo", snapshot: "S0" });
    expect(state.past).toEqual([{ label: "Borrar nodo", snapshot: "S0" }]);
  });

  it("una ráfaga con la misma clave es UN solo paso, y conserva el estado inicial (CA-02.3)", () => {
    let state = pushHistory(empty<string>(), { label: "Editar nodo", coalesceKey: "n1", snapshot: "vacío" });
    state = pushHistory(state, { label: "Editar nodo", coalesceKey: "n1", snapshot: "S" });
    state = pushHistory(state, { label: "Editar nodo", coalesceKey: "n1", snapshot: "Se" });
    state = pushHistory(state, { label: "Editar nodo", coalesceKey: "n1", snapshot: "Seg" });

    expect(state.past).toHaveLength(1);
    // Deshacer debe volver a ANTES de la ráfaga, no una letra atrás.
    expect(state.past[0].snapshot).toBe("vacío");
  });

  it("cambiar de nodo abre una entrada nueva", () => {
    let state = pushHistory(empty<string>(), { label: "Editar nodo", coalesceKey: "n1", snapshot: "A" });
    state = pushHistory(state, { label: "Editar nodo", coalesceKey: "n2", snapshot: "B" });
    expect(state.past).toHaveLength(2);
  });

  it("una operación estructural (sin clave) nunca coalesce", () => {
    let state = pushHistory(empty<string>(), { label: "Añadir acción", snapshot: "A" });
    state = pushHistory(state, { label: "Añadir acción", snapshot: "B" });
    expect(state.past).toHaveLength(2);
  });

  it("respeta el tope y descarta lo más viejo (CA-02.8)", () => {
    let state = empty<number>();
    for (let i = 0; i < 10; i++) state = pushHistory(state, { label: `op ${i}`, snapshot: i }, 4);
    expect(state.past).toHaveLength(4);
    expect(state.past.map((e) => e.snapshot)).toEqual([6, 7, 8, 9]);
  });

  it("limpia rehacer al editar de nuevo", () => {
    const state: HistoryState<string> = {
      past: [],
      future: [{ label: "Borrar nodo", snapshot: "futuro" }],
    };
    expect(pushHistory(state, { label: "Añadir acción", snapshot: "A" }).future).toEqual([]);
  });

  it("limpia rehacer también cuando la edición coalesce", () => {
    const state: HistoryState<string> = {
      past: [{ label: "Editar nodo", coalesceKey: "n1", snapshot: "A" }],
      future: [{ label: "Borrar nodo", snapshot: "futuro" }],
    };
    const next = pushHistory(state, { label: "Editar nodo", coalesceKey: "n1", snapshot: "B" });
    expect(next.past).toHaveLength(1);
    expect(next.future).toEqual([]);
  });
});

describe("undoHistory / redoHistory", () => {
  it("deshace restaurando el estado guardado y manda el actual a rehacer", () => {
    const state = pushHistory(empty<string>(), { label: "Borrar nodo", snapshot: "antes" });
    const result = undoHistory(state, "después")!;

    expect(result.restored).toBe("antes");
    expect(result.state.past).toEqual([]);
    expect(result.state.future).toEqual([{ label: "Borrar nodo", snapshot: "después" }]);
  });

  it("rehacer devuelve exactamente el estado que el deshacer descartó", () => {
    const state = pushHistory(empty<string>(), { label: "Borrar nodo", snapshot: "antes" });
    const undone = undoHistory(state, "después")!;
    const redone = redoHistory(undone.state, undone.restored)!;

    expect(redone.restored).toBe("después");
    expect(redone.state.past).toEqual([{ label: "Borrar nodo", snapshot: "antes" }]);
    expect(redone.state.future).toEqual([]);
  });

  it("ida y vuelta completa sobre varias operaciones", () => {
    let state = pushHistory(empty<string>(), { label: "op1", snapshot: "A" });
    state = pushHistory(state, { label: "op2", snapshot: "B" });

    const u1 = undoHistory(state, "C")!;
    expect(u1.restored).toBe("B");
    const u2 = undoHistory(u1.state, u1.restored)!;
    expect(u2.restored).toBe("A");
    expect(undoHistory(u2.state, u2.restored)).toBeNull();

    const r1 = redoHistory(u2.state, u2.restored)!;
    expect(r1.restored).toBe("B");
    const r2 = redoHistory(r1.state, r1.restored)!;
    expect(r2.restored).toBe("C");
    expect(redoHistory(r2.state, r2.restored)).toBeNull();
  });

  it("sin nada que deshacer/rehacer devuelve null (botones deshabilitados)", () => {
    expect(undoHistory(empty<string>(), "actual")).toBeNull();
    expect(redoHistory(empty<string>(), "actual")).toBeNull();
  });
});

describe("snapshotNodes / samePositions", () => {
  const node = (id: string, y: number): CanvasNode =>
    ({
      id,
      type: "action",
      position: { x: 0, y },
      data: { kind: "action", output: { type: "createNotification", severity: "info", message: "m" } },
    }) as CanvasNode;

  it("el snapshot no comparte el array ni las posiciones con el original", () => {
    const nodes = [node("a", 10)];
    const snap = snapshotNodes(nodes);
    nodes[0].position.y = 999;
    expect(snap[0].position.y).toBe(10);
  });

  it("comparte `data` a propósito: se trata como inmutable", () => {
    const nodes = [node("a", 10)];
    expect(snapshotNodes(nodes)[0].data).toBe(nodes[0].data);
  });

  it("detecta que un clic sin desplazamiento no movió nada (CA-02.4)", () => {
    const nodes = [node("a", 10), node("b", 20)];
    expect(samePositions(snapshotNodes(nodes), nodes)).toBe(true);
  });

  it("detecta el desplazamiento real", () => {
    const before = snapshotNodes([node("a", 10)]);
    expect(samePositions(before, [node("a", 40)])).toBe(false);
  });

  it("un nodo añadido o quitado cuenta como cambio", () => {
    const before = snapshotNodes([node("a", 10)]);
    expect(samePositions(before, [node("a", 10), node("b", 20)])).toBe(false);
  });
});
