import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-border-bright bg-surface-2 text-muted",
        accent: "border-accent/40 bg-accent/10 text-accent",
        consensus: "border-consensus/40 bg-consensus/10 text-consensus",
        conflict: "border-conflict/40 bg-conflict/10 text-conflict",
        review: "border-review/40 bg-review/10 text-review",
        sync: "border-sync/40 bg-sync/10 text-sync",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
