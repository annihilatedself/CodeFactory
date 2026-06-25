import { useEffect, useRef, useState } from "react";
import { Sparkles, CornerDownLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import type { QueryMetric, QueryResult } from "@/sim/types";

const SIGNALS: { label: string; color: string }[] = [
  { label: "sync", color: "#4d8dff" },
  { label: "review", color: "#f5b53d" },
  { label: "conflict", color: "#fb5c6e" },
  { label: "consensus", color: "#34e3a4" },
];

const SUGGESTIONS = [
  "What's the biggest risk right now?",
  "Why can I trust this migration?",
  "Status of OpenSearch",
  "When will it finish?",
];

const TONE_BAR: Record<QueryResult["tone"], string> = {
  info: "bg-accent",
  consensus: "bg-consensus",
  conflict: "bg-conflict",
  review: "bg-review",
};

const METRIC_TONE: Record<NonNullable<QueryMetric["tone"]>, string> = {
  accent: "text-accent",
  conflict: "text-conflict",
  review: "text-review",
  sync: "text-sync",
  default: "text-fg",
};

export function CopilotConsole({ ask }: { ask: (q: string) => QueryResult }) {
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    const result = ask(t);
    setHistory((h) => [...h, result].slice(-8));
    setInput("");
    setOpen(true);
  }

  const hasHistory = history.length > 0;

  return (
    <Panel className="w-[min(94vw,600px)] overflow-hidden">
      {/* header: copilot identity + signal legend + collapse */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Aieven Copilot
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            {SIGNALS.map((s) => (
              <span key={s.label} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                />
                <span className="text-[10px] text-faint">{s.label}</span>
              </span>
            ))}
          </div>
          {hasHistory && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="cursor-pointer text-faint hover:text-fg"
              aria-label={open ? "Collapse answers" : "Expand answers"}
            >
              {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* answer stream */}
      {open && (
        <div ref={scrollRef} className="scroll-thin max-h-[244px] overflow-y-auto px-3 py-2.5">
          {!hasHistory ? (
            <p className="px-1 py-1 text-[12px] leading-relaxed text-muted">
              Ask the orchestrator anything about the live migration — risks, consensus,
              a specific system, an agent by id, or an ETA. Answers are synthesized from
              real-time swarm telemetry.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((r) => (
                <Answer key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-white/[0.06] p-2.5"
      >
        <div className="glass-inset flex items-center gap-2 rounded-xl px-3 py-2 focus-within:border-accent/50">
          <Sparkles size={15} className="shrink-0 text-faint" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask what's happening across the swarm…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-fg placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-void transition disabled:opacity-30"
          >
            <CornerDownLeft size={12} />
            Ask
          </button>
        </div>
        {!hasHistory && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted transition hover:border-accent/40 hover:text-fg"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </Panel>
  );
}

function Answer({ r }: { r: QueryResult }) {
  return (
    <div>
      <p className="mb-1 text-right font-mono text-[11px] text-faint">{r.query}</p>
      <div className="glass-inset relative overflow-hidden rounded-xl px-3 py-2.5">
        <span className={`absolute inset-y-0 left-0 w-0.5 ${TONE_BAR[r.tone]}`} />
        <p className="text-[13px] font-medium leading-snug text-fg">{r.headline}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">{r.detail}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {r.metrics.map((m) => (
            <span
              key={m.label}
              className="glass-inset flex items-baseline gap-1.5 rounded-md px-2 py-1"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
                {m.label}
              </span>
              <span
                className={`tabular font-mono text-[12px] font-semibold ${
                  METRIC_TONE[m.tone ?? "default"]
                }`}
              >
                {m.value}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-2 font-mono text-[9.5px] text-faint">sources · {r.citations.join(" · ")}</p>
      </div>
    </div>
  );
}
