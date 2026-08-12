/**
 * Start the whole stack.
 *
 * `npm run dev` used to start the frontend only, so sign-in failed on a fresh
 * terminal every single time: the page loads fine, then every request goes to
 * an auth gateway that was never started. Three services have to be up —
 * this starts them together and shuts them down together.
 *
 *   Claims API    :3000   backend/api        (needs Postgres)
 *   Auth gateway  :4000   backend/auth-gateway
 *   Frontend      :5173   frontend
 *
 * Use `npm run dev:frontend` for the old single-service behaviour.
 * No dependencies: this runs on plain Node so `npm install` is not a
 * prerequisite for the command that is supposed to get you running.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SERVICES = [
  { name: "api", port: 3000, cwd: "backend/api", colour: "[36m" },
  { name: "gateway", port: 4000, cwd: "backend/auth-gateway", colour: "[35m" },
  { name: "web", port: 5173, cwd: "frontend", colour: "[32m" },
];

const DIM = "[2m";
const RESET = "[0m";
const YELLOW = "[33m";

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(400);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const children = [];
let shuttingDown = false;

function stopAll(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

function start({ name, cwd, colour }) {
  const label = `${colour}${name.padEnd(7)}${RESET} ${DIM}|${RESET} `;
  const child = spawn("npm", ["run", "dev"], {
    cwd: join(ROOT, cwd),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  const relay = (stream) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) process.stdout.write(label + line + "\n");
    });
  };
  relay(child.stdout);
  relay(child.stderr);

  child.on("exit", (code) => {
    if (shuttingDown) return;
    process.stdout.write(
      `${label}${YELLOW}exited with code ${code}${RESET}\n`,
    );
    // One service dying means the app is broken; don't leave a half-stack up
    // pretending to work, because that is exactly the confusing state this
    // script exists to prevent.
    stopAll(code ?? 1);
  });
}

const missing = SERVICES.filter((s) => !existsSync(join(ROOT, s.cwd, "package.json")));
if (missing.length) {
  console.error(`Missing service directories: ${missing.map((m) => m.cwd).join(", ")}`);
  process.exit(1);
}

if (!existsSync(join(ROOT, "frontend/.env"))) {
  console.log(
    `${YELLOW}note${RESET} ${DIM}|${RESET} frontend/.env not found — the app will use Vite's proxy to :4000, which is fine for local dev.`,
  );
}

for (const service of SERVICES) {
  if (await portInUse(service.port)) {
    console.log(
      `${YELLOW}skip${RESET} ${DIM}|${RESET} ${service.name} — port ${service.port} already in use, leaving it alone`,
    );
    continue;
  }
  start(service);
}

console.log(
  `${DIM}starting api :3000, gateway :4000, web :5173 — Ctrl-C stops all three${RESET}`,
);
