import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Glass HUD surface that floats over the swarm field. */
export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass glass-sheen rounded-2xl", className)} {...props} />
  );
}

export function PanelHeader({
  title,
  icon,
  right,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-faint">{icon}</span> : null}
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}
