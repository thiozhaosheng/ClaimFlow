"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect when Cmd (Mac) or Ctrl (Windows) key is being held down.
 */
export function useHotkeyHints() {
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setShowHints(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setShowHints(false);
      }
    };

    const handleBlur = () => {
      setShowHints(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return showHints;
}
