"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Crucial: remove h-full classes that lock scroll viewport height to exactly screen size
    document.documentElement.classList.remove("h-full");
    document.body.classList.remove("h-full");
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.overflow = "auto";

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      "ontouchstart" in window
    ) {
      return;
    }

    let lenis: Lenis | null = null;
    let raf = 0;

    const timer = setTimeout(() => {
      lenis = new Lenis({
        duration: 0.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      // Force initial resize check
      lenis.resize();

      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }, 3000);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      if (lenis) {
        lenis.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}

