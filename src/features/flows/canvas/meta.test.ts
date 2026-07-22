import { describe, it, expect } from "vitest";
import { defaultOutputForType } from "./meta";

describe("defaultOutputForType — webhook (spec 034 §A)", () => {
  it("nace en modo Simple: payload plano, sin secreto (revierte el default envelope de 032)", () => {
    const output = defaultOutputForType("webhook");
    expect(output).toEqual({ type: "webhook", url: "", secret: "", payloadShape: "bare" });
  });

  it("no fuerza una firma en webhooks nuevos (secret vacío)", () => {
    const output = defaultOutputForType("webhook");
    if (output.type !== "webhook") throw new Error("unexpected type");
    expect(output.secret).toBe("");
    expect(output.payloadShape).toBe("bare");
  });
});
