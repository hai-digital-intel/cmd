import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted text-foreground",
        outline: "border-border-strong bg-transparent text-muted-foreground",
        success: "border-transparent bg-success-bg text-success-foreground",
        progress: "border-transparent bg-progress-bg text-progress-foreground",
        waiting: "border-transparent bg-waiting-bg text-waiting-foreground",
        blocked: "border-transparent bg-blocked-bg text-blocked-foreground",
        confirm: "border-transparent bg-confirm-bg text-confirm-foreground",
        na: "border-transparent bg-surface-sunken text-na-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
