import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initVisibilityAwarePolling, stopVisibilityAwarePolling } from "./visibility-aware";
import { pollingManager } from "./polling-manager";

// Tests run under the Node vitest environment (no DOM) — same reasoning as
// the `localStorage` polyfills in `vault.test.ts`/`connections.test.ts`:
// provide a minimal `document` (just enough EventTarget surface) instead of
// pulling in jsdom, which isn't a dependency of this project.
const fakeDocument = Object.assign(new EventTarget(), {
  visibilityState: "visible" as DocumentVisibilityState,
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  writable: true,
  value: fakeDocument,
});

function fireVisibilityChange(state: DocumentVisibilityState) {
  fakeDocument.visibilityState = state;
  fakeDocument.dispatchEvent(new Event("visibilitychange"));
}

describe("visibility-aware polling", () => {
  beforeEach(() => {
    stopVisibilityAwarePolling();
  });
  afterEach(() => {
    stopVisibilityAwarePolling();
    vi.restoreAllMocks();
  });

  it("calls pauseAll/resumeAll exactly once per visibilitychange event", () => {
    const pauseSpy = vi.spyOn(pollingManager, "pauseAll").mockImplementation(() => {});
    const resumeSpy = vi.spyOn(pollingManager, "resumeAll").mockImplementation(() => {});

    initVisibilityAwarePolling();
    fireVisibilityChange("hidden");
    fireVisibilityChange("visible");

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });

  it("stop then init again does not double-register the listener (regression: stale listener leak)", () => {
    const pauseSpy = vi.spyOn(pollingManager, "pauseAll").mockImplementation(() => {});

    initVisibilityAwarePolling();
    stopVisibilityAwarePolling();
    initVisibilityAwarePolling();

    fireVisibilityChange("hidden");

    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it("stop() removes the listener so a later event calls nothing", () => {
    const pauseSpy = vi.spyOn(pollingManager, "pauseAll").mockImplementation(() => {});

    initVisibilityAwarePolling();
    stopVisibilityAwarePolling();

    fireVisibilityChange("hidden");

    expect(pauseSpy).not.toHaveBeenCalled();
  });
});
