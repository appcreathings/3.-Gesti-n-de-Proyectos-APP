import { useState } from "react";
import { AlertCircle, Ban, Check, ChevronRight, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatPart } from "@/store/useChatStore";

type ToolCallPart = Extract<ChatPart, { kind: "toolCall" }>;

const STATUS_META = {
  running: { icon: Loader2, label: "ejecutando…", cls: "text-muted-foreground" },
  ok: { icon: Check, label: "ok", cls: "text-success" },
  error: { icon: AlertCircle, label: "error", cls: "text-destructive" },
  cancelled: { icon: Ban, label: "cancelada", cls: "text-muted-foreground" },
} as const;

function summarize(part: ToolCallPart): string {
  if (part.status === "error") return part.error ?? "error";
  if (Array.isArray(part.result)) return `${part.result.length} resultados`;
  return "";
}

/** Transparency chip: shows each tool call, expandable to args/result JSON. */
export function ToolCallChip({ part }: { part: ToolCallPart }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[part.status];
  const Icon = meta.icon;
  const summary = summarize(part);

  return (
    <div className="my-1 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-left text-muted-foreground transition-colors hover:bg-muted"
      >
        <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
        <Wrench className="size-3" />
        <code className="font-mono">{part.name}</code>
        {summary && <span className="truncate">· {summary}</span>}
        <Icon
          className={cn("ml-auto size-3 shrink-0", meta.cls, part.status === "running" && "animate-spin")}
          aria-label={meta.label}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-1 rounded-md border bg-muted/20 p-2 font-mono">
          <div>
            <span className="font-semibold">args:</span>{" "}
            <span className="break-all">{JSON.stringify(part.args)}</span>
          </div>
          {part.result !== undefined && (
            <div className="max-h-40 overflow-y-auto">
              <span className="font-semibold">resultado:</span>{" "}
              <span className="break-all">{JSON.stringify(part.result)}</span>
            </div>
          )}
          {part.error && (
            <div className="text-destructive">
              <span className="font-semibold">error:</span> {part.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
