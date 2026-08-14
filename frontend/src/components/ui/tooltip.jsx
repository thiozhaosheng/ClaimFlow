import { forwardRef } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils.js";

/**
 * The native `title` tooltip is the browser's, not ours: it renders at
 * whatever width the OS picks, wherever the cursor happens to be — which is
 * how a policy note ended up as a wide two-line slab sitting on top of the
 * search box. This one is portalled and collision-aware, so it never covers a
 * control, and it wraps inside a measured column instead of sprawling.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef(
  ({ className, side = "top", align = "start", sideOffset = 6, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        // Collision padding keeps it off the viewport edge; Radix flips the
        // side on its own when there is no room.
        collisionPadding={8}
        className={cn(
          "z-[1200] w-max max-w-[16rem] rounded-ds-control border border-border-subtle",
          "bg-card text-foreground shadow-ds-lg outline-none",
          "px-2.5 py-1.5 text-[12px] leading-[1.45]",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
