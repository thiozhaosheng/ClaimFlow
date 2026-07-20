// Builds the command list for the ⌘K palette. Kept separate from the React
// component so the role-gating logic is easy to unit-test.

// Role → its primary workspace destination.
const WORKSPACE = {
  employee: { to: "/employee", label: "Go to Submit & track", chord: "G E" },
  approving: { to: "/approving", label: "Go to Approval queue", chord: "G A" },
  finance: { to: "/finance", label: "Go to Workspace", chord: "G F" },
};

const RESOURCES = [
  { to: "/compliance", label: "Go to Compliance", chord: "G C" },
  { to: "/policies", label: "Go to Approval rules", chord: "G R" },
  { to: "/privacy", label: "Go to Privacy notice", chord: "G P" },
];

/**
 * @param {object} ctx
 * @param {string} ctx.role         current session role (employee|approving|finance)
 * @param {(path: string) => void} ctx.navigate
 * @param {() => void} ctx.toggleTheme
 * @param {string} ctx.theme        "light" | "dark"
 * @param {() => void} ctx.logout
 * @param {() => void} ctx.openHelp
 * @returns {Array<{id:string,label:string,group:string,icon:string,chord?:string,keywords?:string,perform:() => void}>}
 */
export function buildCommands({ role, navigate, toggleTheme, theme, logout, openHelp }) {
  const commands = [];

  const ws = WORKSPACE[role];
  if (ws) {
    commands.push({
      id: "nav-workspace",
      label: ws.label,
      group: "Navigate",
      icon: "layout",
      chord: ws.chord,
      keywords: "home workspace dashboard",
      perform: () => navigate(ws.to),
    });
  }

  for (const r of RESOURCES) {
    commands.push({
      id: `nav-${r.to}`,
      label: r.label,
      group: "Navigate",
      icon: "book",
      chord: r.chord,
      keywords: "policy rules privacy compliance resources",
      perform: () => navigate(r.to),
    });
  }

  commands.push(
    {
      id: "toggle-theme",
      label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      group: "Actions",
      icon: theme === "dark" ? "sun" : "moon",
      keywords: "theme dark light appearance",
      perform: toggleTheme,
    },
    {
      id: "show-shortcuts",
      label: "Show keyboard shortcuts",
      group: "Actions",
      icon: "keyboard",
      chord: "?",
      keywords: "help shortcuts keys hotkeys",
      perform: openHelp,
    },
    {
      id: "sign-out",
      label: "Sign out",
      group: "Actions",
      icon: "logout",
      keywords: "logout exit leave",
      perform: logout,
    },
  );

  return commands;
}

/**
 * Case-insensitive substring filter over label + keywords.
 * @param {Array} commands
 * @param {string} query
 */
export function filterCommands(commands, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((c) =>
    `${c.label} ${c.keywords || ""}`.toLowerCase().includes(q),
  );
}
