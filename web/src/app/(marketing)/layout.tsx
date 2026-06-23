import type { ReactNode } from "react";
import { LenisProvider } from "@/features/marketing/lenis-provider";

/**
 * Marketing shell — full-bleed, always-dark cinematic canvas, independent of
 * the authenticated app chrome. `.dark` is forced here so the landing page is
 * dark regardless of the app's theme preference.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark relative min-h-screen overflow-x-clip bg-zinc-950 text-white antialiased">
      <LenisProvider>{children}</LenisProvider>
    </div>
  );
}
