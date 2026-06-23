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

  it("navigates on a g-then-key chord", () => {
    const h = setup();
    press("g");
    press("e");
    expect(h.navigate).toHaveBeenCalledWith("/employee");
    press("g");
    press("f");
    expect(h.navigate).toHaveBeenCalledWith("/finance");
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
    press("x"); // not a chord target — should reset
    expect(h.navigate).not.toHaveBeenCalled();
    press("e"); // 'e' alone does nothing
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
