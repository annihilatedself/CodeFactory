import { Check } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PHASES } from "@/sim/migrationPlan";
import type { Snapshot } from "@/sim/types";

export function PhaseTracker({ snap }: { snap: Snapshot }) {
  const { index, phaseProgress } = snap.phase;
  return (
    <Panel>
      <PanelHeader
        title="Migration Plan"
        right={
          <span className="font-mono text-[10px] text-faint">
            phase {index + 1}/{PHASES.length}
          </span>
        }
      />
      <div className="flex flex-col gap-0 p-2.5">
        {PHASES.map((p, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <div key={p.id} className="flex gap-2.5">
              {/* rail */}
              <div className="flex flex-col items-center">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    done
                      ? "border-consensus bg-consensus/15 text-consensus"
                      : active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border-bright text-faint"
                  }`}
                >
                  {done ? <Check size={11} /> : i + 1}
                </span>
                {i < PHASES.length - 1 && (
                  <span
                    className={`my-0.5 w-px flex-1 ${done ? "bg-consensus/40" : "bg-border"}`}
                  />
                )}
              </div>
              {/* body */}
              <div className={`pb-3 ${active ? "" : "opacity-70"}`}>
                <p
                  className={`text-[12px] leading-snug ${
                    active ? "font-medium text-fg" : "text-muted"
                  }`}
                >
                  {p.label}
                </p>
                {active && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 w-28 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${phaseProgress * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-accent">
                      {Math.round(phaseProgress * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
