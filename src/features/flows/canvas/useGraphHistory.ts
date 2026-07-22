import { useCallback, useRef, useState } from "react";
import type { CanvasNode } from "./nodeTypes";

/**
 * Historial de deshacer/rehacer del canvas (spec 038 §C). De **sesión**: vive
 * mientras el editor está abierto, no se persiste (el versionado con rollback
 * es 033 §C2 y sigue en backlog — son dos funciones distintas).
 *
 * Por qué NO se suscribe a `onNodesChange` (R1): React Flow emite
 * `{ type: "position", dragging: true }` en cada frame de un arrastre y
 * `{ type: "select" }` en cada clic. Un historial alimentado por ese stream
 * guardaría cientos de entradas por gesto y `Ctrl+Z` movería el nodo un píxel.
 * El historial se alimenta de **puntos de commit explícitos**: los mismos
 * lugares donde el canvas ya llama `setNodes` con una intención semántica.
 */

/** Una entrada apilada: el estado **anterior** a una operación, con su
 * etiqueta para el tooltip del botón ("Deshacer: Borrar acción"). */
export interface HistoryEntry<T> {
  label: string;
  /** Identidad de la ráfaga que se colapsa en un solo paso (CA-02.3) — el
   * `nodeId` para las ediciones del drawer. Sin clave, cada commit apila. */
  coalesceKey?: string;
  snapshot: T;
}

export interface HistoryState<T> {
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
}

/** Tope por defecto del historial (CA-02.8): no crece sin límite; al pasarse
 * se descarta lo más viejo. */
export const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Apila el estado previo a una operación. Reglas:
 *
 *  - **Coalescing por clave** (CA-02.3): si el tope ya tiene la misma
 *    `coalesceKey`, NO se apila nada — se conserva el snapshot del tope, que
 *    es el estado de *antes de empezar la ráfaga*. Escribir "Seguimiento ACME"
 *    en un título es un paso de deshacer, no diecisiete. (Reemplazar el
 *    snapshot por el nuevo daría exactamente lo contrario: deshacer una letra.)
 *    La clave es la **identidad** del nodo y no un debounce temporal: un
 *    debounce partiría la ráfaga en trozos arbitrarios según cuánto tarde el
 *    usuario en pensar.
 *  - **Rehacer se limpia** con cualquier edición nueva, incluida una
 *    coalescida: la rama futura dejó de ser alcanzable.
 */
export function pushHistory<T>(
  state: HistoryState<T>,
  entry: HistoryEntry<T>,
  limit = DEFAULT_HISTORY_LIMIT,
): HistoryState<T> {
  const top = state.past[state.past.length - 1];
  if (entry.coalesceKey !== undefined && top?.coalesceKey === entry.coalesceKey) {
    return { past: state.past, future: [] };
  }
  const past = [...state.past, entry];
  // El tope descarta por el extremo viejo, nunca la operación recién hecha.
  if (past.length > limit) past.splice(0, past.length - limit);
  return { past, future: [] };
}

/** Deshace: devuelve el estado a restaurar y el historial resultante, con el
 * estado `current` empujado a la pila de rehacer. `null` si no hay nada que
 * deshacer. */
export function undoHistory<T>(
  state: HistoryState<T>,
  current: T,
): { state: HistoryState<T>; restored: T } | null {
  const entry = state.past[state.past.length - 1];
  if (!entry) return null;
  return {
    state: {
      past: state.past.slice(0, -1),
      future: [...state.future, { ...entry, snapshot: current }],
    },
    restored: entry.snapshot,
  };
}

/** Rehace: simétrico de `undoHistory`. `null` si no hay nada que rehacer. */
export function redoHistory<T>(
  state: HistoryState<T>,
  current: T,
): { state: HistoryState<T>; restored: T } | null {
  const entry = state.future[state.future.length - 1];
  if (!entry) return null;
  return {
    state: {
      past: [...state.past, { ...entry, snapshot: current }],
      future: state.future.slice(0, -1),
    },
    restored: entry.snapshot,
  };
}

/** Copia para el historial: array nuevo, nodo nuevo y `position` nueva. `data`
 * se comparte por referencia a propósito — se trata como inmutable
 * (`updateNodeData` reemplaza el objeto entero), así que clonarlo hondo sería
 * gasto puro. */
export function snapshotNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((n) => ({ ...n, position: { ...n.position } }));
}

/** ¿Cambió algo posicional entre dos snapshots? Evita apilar un "Mover" cuando
 * el arrastre fue en realidad un clic (React Flow emite drag start/stop igual). */
export function samePositions(a: CanvasNode[], b: CanvasNode[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((n, i) => {
    const o = b[i];
    return o && n.id === o.id && n.position.x === o.position.x && n.position.y === o.position.y;
  });
}

export interface GraphHistory {
  /** Apila el estado **actual** justo ANTES de mutarlo. Llamar primero,
   * mutar después: deshacer restaura lo guardado y empuja el estado presente a
   * rehacer — el modelo que evita el clásico "el primer Ctrl+Z no hace nada". */
  commit: (label: string, coalesceKey?: string) => void;
  /** Snapshot del estado actual, para los casos donde el estado previo ya no
   * está disponible en el momento del commit: el arrastre lo mutó frame a
   * frame, así que se captura en `onNodeDragStart` y se apila al soltar. */
  capture: () => CanvasNode[];
  /** Apila un snapshot capturado antes (ver `capture`). */
  commitCaptured: (label: string, snapshot: CanvasNode[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Operación que deshará el próximo `Ctrl+Z` — para el `title` del botón. */
  undoLabel?: string;
  redoLabel?: string;
}

export function useGraphHistory(opts: {
  nodes: CanvasNode[];
  setNodes: (nodes: CanvasNode[]) => void;
  /** Se llama tras deshacer/rehacer con el grafo restaurado — el canvas lo usa
   * para cerrar el drawer si su nodo dejó de existir (CA-02.7). */
  onRestore?: (restored: CanvasNode[]) => void;
  limit?: number;
}): GraphHistory {
  const { nodes, setNodes, onRestore, limit = DEFAULT_HISTORY_LIMIT } = opts;

  // Los nodos del render actual, legibles desde cualquier callback sin
  // re-crearlo en cada cambio del grafo.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // El historial vive a la vez en un ref (lectura síncrona dentro de los
  // handlers) y en estado (para que `canUndo`/`canRedo` re-rendericen los
  // botones). Así los updaters quedan puros: nada de `setNodes` dentro de un
  // `setState`.
  const [state, setState] = useState<HistoryState<CanvasNode[]>>({ past: [], future: [] });
  const stateRef = useRef(state);

  const apply = useCallback((next: HistoryState<CanvasNode[]>) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const capture = useCallback(() => snapshotNodes(nodesRef.current), []);

  const commitCaptured = useCallback(
    (label: string, snapshot: CanvasNode[]) => {
      apply(pushHistory(stateRef.current, { label, snapshot }, limit));
    },
    [apply, limit],
  );

  const commit = useCallback(
    (label: string, coalesceKey?: string) => {
      apply(
        pushHistory(stateRef.current, { label, coalesceKey, snapshot: snapshotNodes(nodesRef.current) }, limit),
      );
    },
    [apply, limit],
  );

  const undo = useCallback(() => {
    const result = undoHistory(stateRef.current, snapshotNodes(nodesRef.current));
    if (!result) return;
    apply(result.state);
    setNodes(result.restored);
    onRestore?.(result.restored);
  }, [apply, setNodes, onRestore]);

  const redo = useCallback(() => {
    const result = redoHistory(stateRef.current, snapshotNodes(nodesRef.current));
    if (!result) return;
    apply(result.state);
    setNodes(result.restored);
    onRestore?.(result.restored);
  }, [apply, setNodes, onRestore]);

  return {
    commit,
    capture,
    commitCaptured,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoLabel: state.past[state.past.length - 1]?.label,
    redoLabel: state.future[state.future.length - 1]?.label,
  };
}
