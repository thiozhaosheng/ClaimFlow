import * as React from "react";
import { cn } from "@/lib/cn";

/** Floating bento card: white fill, hairline border, wide ambient shadow. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pb-0", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-widest text-fg-tertiary",
        className,
      )}
      {...props}
    />
  );
}
