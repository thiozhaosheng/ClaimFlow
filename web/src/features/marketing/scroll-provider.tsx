"use client";
import { useEffect, type ReactNode } from "react";

/**
 * Native scroll for the marketing pages.
 *
 * We deliberately do NOT use a smooth-scroll library (Lenis etc.). Those
 * intercept the wheel and re-drive scroll position on the main thread with an
 * easing, which adds input latency and stutters whenever the main thread is
 * busy. Native scrolling runs on the compositor thread — it tracks input 1:1
 * with true OS momentum, which is the crisp "Apple" feel.
 *
 * This provider only (a) undoes the authenticated app shell's locked
 * full-height so the document can grow and scroll, and (b) enables smooth
 * behavior for in-page anchor jumps (wheel/trackpad stay native).
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      scrollBehavior: html.style.scrollBehavior,
    };

    html.classList.remove("h-full");
    body.classList.remove("h-full");
    html.style.height = "auto";
    body.style.height = "auto";
    body.style.overflow = "auto";
    html.style.scrollBehavior = "smooth"; // anchor/keyboard jumps only

    return () => {
      html.style.height = prev.htmlHeight;
      body.style.height = prev.bodyHeight;
      body.style.overflow = prev.bodyOverflow;
      html.style.scrollBehavior = prev.scrollBehavior;
    };
  }, []);

  return <>{children}</>;
}
