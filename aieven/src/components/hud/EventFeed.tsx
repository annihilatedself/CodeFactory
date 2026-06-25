import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  GitPullRequestArrow,
  Info,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { EventLevel, Snapshot } from "@/sim/types";

const META: Record<EventLevel, { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: "text-faint" },
  consensus: { icon: CheckCircle2, color: "text-consensus" },
  conflict: { icon: AlertTriangle, color: "text-conflict" },
  review: { icon: GitPullRequestArrow, color: "text-review" },
  commit: { icon: PackageCheck, color: "text-accent" },
};

function ago(t: number, now: number): string {
  const d = Math.max(0, now - t);
  if (d < 1) return "now";
  if (d < 60) return `${Math.floor(d)}s`;
  return `${Math.floor(d / 60)}m`;
}

export function EventFeed({ snap }: { snap: Snapshot }) {
  const listRef = useRef<HTMLDivElement>(null);
  const now = snap.stats.elapsed;
  const topId = snap.events[0]?.id;

  // flash the newest item by keying off the latest id
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [topId]);

  return (
    <Panel className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Coordination Feed"
        right={
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-faint">
            <span className="h-1.5 w-1.5 animate-blip rounded-full bg-accent" />
            streaming
          </span>
        }
      />
      <div ref={listRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {snap.events.map((e, i) => {
          const m = META[e.level];
          const Icon = m.icon;
          return (
            <div
              key={e.id}
              className={`flex gap-2.5 rounded-lg px-2 py-1.5 ${
                i === 0 ? "bg-surface-2/40" : ""
              }`}
            >
              <Icon size={14} className={`mt-0.5 shrink-0 ${m.color}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[12px] font-medium text-fg">{e.text}</p>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint">
                    {ago(e.time, now)}
                  </span>
                </div>
                {e.detail && (
                  <p className="truncate font-mono text-[10.5px] text-muted">{e.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
