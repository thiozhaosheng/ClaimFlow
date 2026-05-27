import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium tabular-nums tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent-subtle text-accent",
        secondary:
          "border-border-subtle bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-danger-bg text-danger-text",
        outline: "text-foreground border-border-subtle",
        success:
          "border-transparent bg-success-bg text-success-text",
        warning:
          "border-transparent bg-warning-bg text-warning-text",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
