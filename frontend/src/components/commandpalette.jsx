import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  BookOpen,
  Moon,
  Sun,
  Keyboard,
  LogOut,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import { buildCommands, filterCommands } from "../lib/commands.js";

const ICONS = {
  layout: LayoutDashboard,
  book: BookOpen,
  sun: Sun,
  moon: Moon,
  keyboard: Keyboard,
  logout: LogOut,
};

/**
 * ⌘K command palette — fuzzy-ish filterable launcher for navigation and
 * actions. Fully keyboard driven: type to filter, ↑/↓ to move, ↵ to run,
 * Esc to close.
 */
export default function CommandPalette({ open, onClose, onOpenHelp }) {
  const navigate = useNavigate();
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const commands = useMemo(
    () =>
      buildCommands({
        role: session?.role,
        navigate,
        toggleTheme,
        theme,
        logout,
        openHelp: () => {
          onClose?.();
          onOpenHelp?.();
        },
      }),
    [session?.role, navigate, toggleTheme, theme, logout, onClose, onOpenHelp],
  );

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Reset state each time the palette opens, and focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  // Global Escape — closes even if focus has left the search input.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Clamp the active index whenever the result set shrinks.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (cmd) => {
    if (!cmd) return;
    onClose?.();
    // Let the palette close before navigating/acting for a smoother transition.
    requestAnimationFrame(() => cmd.perform());
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  };

  // Group results in display order while keeping a flat index for keyboard nav.
  let flatIndex = -1;
  const groups = [];
  for (const cmd of results) {
    let g = groups.find((x) => x.name === cmd.group);
    if (!g) {
      g = { name: cmd.group, items: [] };
      groups.push(g);
    }
    flatIndex += 1;
    g.items.push({ cmd, index: flatIndex });
  }

  return (
    <div
      className="cmdk-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmdk-input-row">
          <Search className="h-4 w-4 text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            placeholder="Search commands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search commands"
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>

        <div className="cmdk-list" ref={listRef} role="listbox">
          {results.length === 0 ? (
            <div className="cmdk-empty">No commands match “{query}”.</div>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="cmdk-group">
                <div className="cmdk-group-label">{group.name}</div>
                {group.items.map(({ cmd, index }) => {
                  const Icon = ICONS[cmd.icon] || LayoutDashboard;
                  const selected = index === active;
                  return (
                    <button
                      type="button"
                      key={cmd.id}
                      id={`cmdk-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={selected}
                      className={`cmdk-item ${selected ? "is-active" : ""}`}
                      onMouseMove={() => setActive(index)}
                      onClick={() => run(cmd)}
                    >
                      <Icon className="h-4 w-4 cmdk-item-icon" />
                      <span className="cmdk-item-label">{cmd.label}</span>
                      {cmd.chord && <kbd className="cmdk-chord">{cmd.chord}</kbd>}
                      {selected && (
                        <CornerDownLeft className="h-3.5 w-3.5 cmdk-item-enter" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
