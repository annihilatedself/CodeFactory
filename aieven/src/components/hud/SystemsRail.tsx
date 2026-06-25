import { Cpu, Database, Search, Radio, GitBranch, type LucideIcon } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { Snapshot } from "@/sim/types";

const ICONS: Record<string, LucideIcon> = {
  coord: Cpu,
  kafka: Radio,
  pg: Database,
  os: Search,
  reg: GitBranch,
};

const HEALTH: Record<string, { label: string; dot: string; text: string }> = {
  nominal: { label: "nominal", dot: "bg-consensus", text: "text-consensus" },
  strained: { label: "strained", dot: "bg-review", text: "text-review" },
  degraded: { label: "degraded", dot: "bg-conflict", text: "text-conflict" },
};

export function SystemsRail({ snap }: { snap: Snapshot }) {
  return (
    <Panel>
      <PanelHeader title="Target Systems" />
      <div className="flex flex-col gap-1 p-2">
        {snap.systems.map((s) => {
          const Icon = ICONS[s.id] ?? Cpu;
          const h = HEALTH[s.health];
          return (
            <div
              key={s.id}
              className="rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/60"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md border"
                  style={{
                    color: s.color,
                    borderColor: `${s.color}55`,
                    background: `${s.color}14`,
                  }}
                >
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[13px] font-medium text-fg">{s.label}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      {Math.round(s.progress * 100)}%
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-faint">{s.sub}</span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-[38px]">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${s.progress * 100}%`, background: s.color }}
                  />
                </div>
                <span className={`flex items-center gap-1 font-mono text-[9px] uppercase ${h.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />
                  {h.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
