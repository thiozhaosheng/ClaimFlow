"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";
import { HelpCircle } from "lucide-react";

interface InteractiveFlipCardProps {
  children: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  title?: string;
  layout?: "vertical" | "horizontal";
}

export function InteractiveFlipCard({ children, backContent, className, title, layout = "vertical" }: InteractiveFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={cn("perspective-1000 group relative w-full h-full", className)}>
      <div
        className={cn(
          "relative w-full h-full duration-700 preserve-3d transition-transform ease-out-back",
          isFlipped ? "rotate-y-180" : ""
        )}
      >
        {/* Front Side */}
        <div className="backface-hidden w-full h-full">
          {children}
          
          {/* Subtle glowing help badge in top corner */}
          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className="absolute top-3 right-3 z-30 h-5 w-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-accent-fg transition-all shadow-sm cursor-pointer opacity-40 hover:opacity-100 group-hover:opacity-75 active:scale-90"
            title={title || "Click to view description"}
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </div>

        {/* Back Side */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full rounded-2xl border border-accent/20 bg-zinc-950 p-4 flex flex-col justify-between text-left text-white shadow-2xl z-20 overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-indigo-950/20 via-zinc-950 to-accent/10 z-0 pointer-events-none rounded-2xl" />
          
          {layout === "horizontal" ? (
            <div className="relative z-10 w-full h-full flex items-center justify-between gap-4 font-sans">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 shrink-0 select-none">
                <HelpCircle className="h-3.5 w-3.5 text-accent" />
                {title || "Overview"}
              </h3>
              <p className="text-[9px] sm:text-[10px] leading-relaxed text-zinc-300 font-medium flex-1 overflow-y-auto max-h-full pr-1">
                {backContent}
              </p>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-2.5 py-1 rounded-lg font-bold transition-all text-[8px] font-sans uppercase tracking-wider cursor-pointer active:scale-95 shrink-0"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="relative z-10 flex-grow flex flex-col gap-2.5 font-sans min-h-0">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 border-b border-white/10 pb-1.5 shrink-0 select-none">
                  <HelpCircle className="h-3.5 w-3.5 text-accent" />
                  {title || "Overview"}
                </h3>
                <p className="text-[10px] leading-relaxed text-zinc-300 font-medium overflow-y-auto flex-1 pr-1">
                  {backContent}
                </p>
              </div>

              <div className="relative z-10 flex justify-end shrink-0 pt-1.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/15 px-2.5 py-1 rounded-lg font-bold transition-all text-[8px] font-sans uppercase tracking-wider cursor-pointer active:scale-95"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
