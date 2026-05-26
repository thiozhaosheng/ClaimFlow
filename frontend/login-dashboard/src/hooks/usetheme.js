import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "claimflow-theme";

function readInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Bootstrap 5.3 reads data-bs-theme to switch its own utility colors (.table,
    // .form-control, .modal, etc.). Keeping them in sync stops white-on-white
    // and similar Bootstrap-default colors leaking into dark mode.
    document.documentElement.setAttribute("data-bs-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
