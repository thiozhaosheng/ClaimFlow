import { useEffect } from "react";
import { X } from "lucide-react";

const GROUPS = [
  {
    title: "General",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show this shortcuts list" },
      { keys: ["⌘", "\\"], label: "Toggle the sidebar" },
      { keys: ["Esc"], label: "Close dialogs & overlays" },
    ],
  },
  {
    title: "On a claim",
    items: [
      { keys: ["←"], label: "Previous claim" },
      { keys: ["→"], label: "Next claim" },
    ],
  },
  {
    title: "Jump to (press G, then…)",
    items: [
      { keys: ["G", "C"], label: "Compliance" },
      { keys: ["G", "R"], label: "Approval rules" },
      { keys: ["G", "P"], label: "Privacy notice" },
    ],
  },
];

/** Keyboard-shortcuts cheat sheet, opened with "?" or from the palette. */
export default function ShortcutsHelp({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="modal-detail-header">
          <div className="modal-detail-header-text">
            <h3 className="modal-title">Keyboard shortcuts</h3>
            <p className="modal-subtitle">Move through ClaimFlow without the mouse.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body shortcuts-body">
          {GROUPS.map((group) => (
            <div key={group.title} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{group.title}</h4>
              <ul className="shortcuts-list">
                {group.items.map((item) => (
                  <li key={item.label} className="shortcuts-row">
                    <span className="shortcuts-label">{item.label}</span>
                    <span className="shortcuts-keys">
                      {item.keys.map((k, i) => (
                        <kbd key={i} className="shortcuts-kbd">{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="shortcuts-group">
            <h4 className="shortcuts-group-title">Actions</h4>
            <ul className="shortcuts-list">
              <li className="shortcuts-row">
                <span className="shortcuts-label">New claim</span>
                <span className="shortcuts-keys">
                  <kbd className="shortcuts-kbd">⌥</kbd>
                  <kbd className="shortcuts-kbd">N</kbd>
                </span>
              </li>
              <li className="shortcuts-row">
                <span className="shortcuts-label">Submit form</span>
                <span className="shortcuts-keys">
                  <kbd className="shortcuts-kbd">⌥</kbd>
                  <kbd className="shortcuts-kbd">S</kbd>
                </span>
              </li>
              <li className="shortcuts-row">
                <span className="shortcuts-label">Quick Search</span>
                <span className="shortcuts-keys">
                  <kbd className="shortcuts-kbd">⌥</kbd>
                  <kbd className="shortcuts-kbd">/</kbd>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
