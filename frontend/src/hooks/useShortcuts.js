import { useEffect } from "react";

// True when the user is typing into a field — so single-key shortcuts don't
// hijack normal text entry.
export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

/**
 * Global keyboard shortcut handler for power users.
 *
 * - ⌘K / Ctrl+K   → open command palette
 * - ?             → open shortcuts help
 * - g then e/a/f  → jump to the role workspace (Gmail-style chord)
 * - g then c/r/p  → jump to Compliance / Approval rules / Privacy
 *
 * Single-key shortcuts are suppressed while typing in a field or when a
 * modifier (other than the chord) is held.
 *
 * @param {object} handlers
 * @param {() => void} handlers.openPalette
 * @param {() => void} handlers.openHelp
 * @param {(path: string) => void} handlers.navigate
 * @param {boolean} [enabled=true]
 */
export function useShortcuts({ openPalette, openHelp, navigate, enabled = true }) {
  useEffect(() => {
    if (!enabled) return undefined;

    let chordActive = false;
    let chordTimer = null;

    const endChord = () => {
      chordActive = false;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = null;
      }
    };

    const GOTO = {
      e: "/employee",
      a: "/approving",
      f: "/finance",
      c: "/compliance",
      r: "/policies",
      p: "/privacy",
    };

    const onKeyDown = (e) => {
      const cmd = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K — command palette
      if (cmd && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        endChord();
        openPalette?.();
        return;
      }

      if (isTypingTarget(e.target)) return;

      // Resolve a pending "g" chord.
      if (chordActive) {
        const dest = GOTO[e.key?.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate?.(dest);
        }
        endChord();
        return;
      }

      // Ignore other modified keys for single-key shortcuts.
      if (cmd || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        openHelp?.();
        return;
      }

      if (e.key === "g" || e.key === "G") {
        chordActive = true;
        chordTimer = setTimeout(endChord, 1200);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      endChord();
    };
  }, [openPalette, openHelp, navigate, enabled]);
}
