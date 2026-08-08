import { renderHook } from "@testing-library/react";
import { useShortcuts, isTypingTarget } from "./useShortcuts.js";

function press(key, opts = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }),
  );
}

function setup(overrides = {}) {
  const handlers = {
    openPalette: jest.fn(),
    openHelp: jest.fn(),
    navigate: jest.fn(),
    ...overrides,
  };
  renderHook(() => useShortcuts(handlers));
  return handlers;
}

describe("isTypingTarget", () => {
  it("detects form fields and contenteditable", () => {
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.isContentEditable = true;
    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(div)).toBe(true);
    expect(isTypingTarget(document.createElement("span"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("useShortcuts", () => {
  it("opens the palette on Cmd/Ctrl+K", () => {
    const h = setup();
    press("k", { metaKey: true });
    expect(h.openPalette).toHaveBeenCalledTimes(1);
    press("k", { ctrlKey: true });
    expect(h.openPalette).toHaveBeenCalledTimes(2);
  });

  it("opens help on ?", () => {
    const h = setup();
    press("?");
    expect(h.openHelp).toHaveBeenCalledTimes(1);
  });

  // The GOTO map in useShortcuts.js defines exactly three chords:
  // g-c → /compliance, g-r → /policies, g-p → /privacy. Role workspace
  // navigation (/employee, /finance) is the command palette's job — see
  // lib/commands.js and commands.test.js — not this hook's.
  it("navigates on a g-then-key chord", () => {
    const h = setup();
    press("g");
    press("c");
    expect(h.navigate).toHaveBeenCalledWith("/compliance");
    press("g");
    press("r");
    expect(h.navigate).toHaveBeenCalledWith("/policies");
    press("g");
    press("p");
    expect(h.navigate).toHaveBeenCalledWith("/privacy");
    expect(h.navigate).toHaveBeenCalledTimes(3);
  });

  it("ignores single-key shortcuts while typing in a field", () => {
    const h = setup();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", bubbles: true }),
    );
    expect(h.openHelp).not.toHaveBeenCalled();
    // but Cmd+K still works from a field
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
    expect(h.openPalette).toHaveBeenCalled();
    input.remove();
  });

  it("does not fire a stale chord after an unrelated key", () => {
    const h = setup();
    press("g");
    press("x"); // not a chord target — consumes and resets the chord
    expect(h.navigate).not.toHaveBeenCalled();
    // 'c' is a real chord target, so this only stays silent if the chord
    // was genuinely reset above — asserting with a non-target key here
    // would pass even with the reset logic removed.
    press("c");
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
