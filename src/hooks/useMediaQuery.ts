import { useCallback, useSyncExternalStore } from "react";

function getSnapshot(query: string) {
  return () => window.matchMedia(query).matches;
}

function subscribe(query: string) {
  return (callback: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
}

export function useMediaQuery(query: string): boolean {
  const getSnapshotFn = useCallback(getSnapshot(query), [query]);
  const subscribeFn = useCallback(subscribe(query), [query]);
  return useSyncExternalStore(subscribeFn, getSnapshotFn, () => false);
}
