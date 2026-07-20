import { buildCommands, filterCommands } from "./commands.js";

function makeCtx(role, overrides = {}) {
  return {
    role,
    navigate: jest.fn(),
    toggleTheme: jest.fn(),
    theme: "light",
    logout: jest.fn(),
    openHelp: jest.fn(),
    ...overrides,
  };
}

describe("buildCommands", () => {
  it("gives each role its own workspace destination", () => {
    const cases = {
      employee: "/employee",
      approving: "/approving",
      finance: "/finance",
    };
    for (const [role, to] of Object.entries(cases)) {
      const ctx = makeCtx(role);
      const cmds = buildCommands(ctx);
      const ws = cmds.find((c) => c.id === "nav-workspace");
      expect(ws).toBeTruthy();
      ws.perform();
      expect(ctx.navigate).toHaveBeenCalledWith(to);
    }
  });

  it("omits the workspace command for an unknown role", () => {
    const cmds = buildCommands(makeCtx("ghost"));
    expect(cmds.find((c) => c.id === "nav-workspace")).toBeUndefined();
    // resources + actions are still present
    expect(cmds.find((c) => c.id === "nav-/policies")).toBeTruthy();
  });

  it("labels the theme toggle based on the current theme", () => {
    expect(
      buildCommands(makeCtx("employee", { theme: "light" })).find(
        (c) => c.id === "toggle-theme",
      ).label,
    ).toMatch(/dark/i);
    expect(
      buildCommands(makeCtx("employee", { theme: "dark" })).find(
        (c) => c.id === "toggle-theme",
      ).label,
    ).toMatch(/light/i);
  });

  it("wires actions to their handlers", () => {
    const ctx = makeCtx("employee");
    const cmds = buildCommands(ctx);
    cmds.find((c) => c.id === "toggle-theme").perform();
    cmds.find((c) => c.id === "sign-out").perform();
    cmds.find((c) => c.id === "show-shortcuts").perform();
    expect(ctx.toggleTheme).toHaveBeenCalled();
    expect(ctx.logout).toHaveBeenCalled();
    expect(ctx.openHelp).toHaveBeenCalled();
  });
});

describe("filterCommands", () => {
  const cmds = buildCommands(makeCtx("employee"));

  it("returns everything for an empty query", () => {
    expect(filterCommands(cmds, "")).toHaveLength(cmds.length);
    expect(filterCommands(cmds, "   ")).toHaveLength(cmds.length);
  });

  it("matches against label and keywords, case-insensitively", () => {
    const byLabel = filterCommands(cmds, "PRIVACY");
    expect(byLabel.some((c) => c.id === "nav-/privacy")).toBe(true);

    // "appearance" only appears in the theme command's keywords
    const byKeyword = filterCommands(cmds, "appearance");
    expect(byKeyword).toHaveLength(1);
    expect(byKeyword[0].id).toBe("toggle-theme");
  });

  it("returns nothing when there is no match", () => {
    expect(filterCommands(cmds, "zzzznope")).toHaveLength(0);
  });
});
