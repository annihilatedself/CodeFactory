import { Panel } from "@/components/ui/panel";

const LINKS: { label: string; color: string }[] = [
  { label: "data sync", color: "#4d8dff" },
  { label: "peer review", color: "#f5b53d" },
  { label: "conflict", color: "#fb5c6e" },
  { label: "consensus", color: "#34e3a4" },
  { label: "handoff", color: "#22d3a7" },
];

export function Legend() {
  return (
    <Panel className="px-3 py-2">
      <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
        signal types
      </p>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
        {LINKS.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }}
            />
            <span className="text-[11px] text-muted">{l.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
