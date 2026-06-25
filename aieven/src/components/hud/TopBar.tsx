import { Pause, Play, Gauge, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "./Brand";
import { formatNumber, formatCompact } from "@/lib/utils";
import type { Snapshot } from "@/sim/types";

interface Props {
  snap: Snapshot;
  paused: boolean;
  speed: number;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "conflict" | "review" | "default";
}) {
  const color =
    tone === "accent"
      ? "text-accent"
      : tone === "conflict"
        ? "text-conflict"
        : tone === "review"
          ? "text-review"
          : "text-fg";
  return (
    <div className="flex flex-col whitespace-nowrap px-3">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-faint">
        {label}
      </span>
      <span className={`font-mono text-[14px] font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}

export function TopBar({ snap, paused, speed, onTogglePause, onCycleSpeed }: Props) {
  const { stats } = snap;
  return (
    <header className="glass glass-sheen pointer-events-auto flex items-center gap-1 rounded-2xl px-3 py-2">
      <div className="flex items-center gap-2.5 pr-3">
        <BrandMark />
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-display text-[17px] font-semibold tracking-tight text-fg">
              Commander
            </span>
            <Badge variant="accent" className="animate-blip">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              live
            </Badge>
          </div>
          <span className="font-mono text-[10px] text-faint">migration MIG-7841</span>
        </div>
      </div>

      <div className="mx-1 h-9 w-px bg-border/70" />

      <div className="flex items-center divide-x divide-border/60">
        <Metric label="active agents" value={formatNumber(stats.activeAgents)} tone="accent" />
        <Metric label="msg / sec" value={formatCompact(stats.messagesPerSec * 14)} />
        <Metric
          label="consensus"
          value={`${(stats.consensusRate * 100).toFixed(1)}%`}
          tone="accent"
        />
        <Metric
          label="open conflicts"
          value={formatNumber(stats.openConflicts)}
          tone={stats.openConflicts > 0 ? "conflict" : "default"}
        />
        <Metric label="reviews passed" value={formatNumber(stats.reviewsPassed)} tone="review" />
        <Metric label="migrated" value={`${(stats.migrated * 100).toFixed(1)}%`} tone="accent" />
      </div>

      <div className="ml-auto flex items-center gap-2 pl-3">
        <Button variant="ghost" size="sm" onClick={onCycleSpeed} className="font-mono">
          {speed >= 4 ? <FastForward size={14} /> : <Gauge size={14} />}
          {speed}x
        </Button>
        <Button variant={paused ? "accent" : "default"} size="sm" onClick={onTogglePause}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>
    </header>
  );
}
