import { MousePointerClick, Cpu, ArrowLeftRight, X } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import type { AgentState, Snapshot } from "@/sim/types";

const STATE_BADGE: Record<AgentState, { variant: any; label: string }> = {
  working: { variant: "sync", label: "working" },
  reviewing: { variant: "review", label: "reviewing peer" },
  disputing: { variant: "conflict", label: "disputing" },
  consensus: { variant: "consensus", label: "consensus" },
  blocked: { variant: "conflict", label: "blocked" },
  idle: { variant: "default", label: "idle" },
};

export function Inspector({
  snap,
  onClose,
}: {
  snap: Snapshot;
  onClose: () => void;
}) {
  const a = snap.selected;

  return (
    <Panel>
      <PanelHeader
        title="Agent Inspector"
        icon={<Cpu size={13} />}
        right={
          a ? (
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-0.5 text-faint hover:text-fg"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          ) : null
        }
      />
      {!a ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <MousePointerClick size={20} className="text-faint" />
          <p className="text-[12px] leading-relaxed text-muted">
            Click any node in the swarm to inspect an agent — its role, current task,
            confidence, and who it's negotiating with.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[13px] font-semibold text-fg">{a.name}</p>
              <p className="text-[12px] text-muted">{a.role}</p>
            </div>
            <Badge variant={STATE_BADGE[a.state].variant}>{STATE_BADGE[a.state].label}</Badge>
          </div>

          <div className="glass-inset rounded-lg px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
              current task
            </p>
            <p className="mt-0.5 font-mono text-[12px] text-fg">{a.task}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                confidence
              </span>
              <span className="font-mono text-[12px] font-semibold tabular-nums text-accent">
                {(a.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-[width]"
                style={{ width: `${a.confidence * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="glass-inset rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">assigned to</p>
              <p className="mt-0.5 text-fg">{a.systemLabel}</p>
            </div>
            <div className="glass-inset rounded-lg px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">agent id</p>
              <p className="mt-0.5 font-mono text-fg">#{a.id}</p>
            </div>
          </div>

          {a.partner && (
            <div className="flex items-center gap-2 rounded-lg border border-conflict/30 bg-conflict/5 px-3 py-2">
              <ArrowLeftRight size={14} className="shrink-0 text-conflict" />
              <p className="text-[12px] text-muted">
                Negotiating with{" "}
                <span className="font-mono text-fg">{a.partner.name}</span>{" "}
                <span className="text-faint">({a.partner.role})</span>
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
