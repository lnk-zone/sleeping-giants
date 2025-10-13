import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import process from "node:process";

const srcDir = path.join(process.cwd(), "src");
let child = null;
let restartTimer = null;

function startServer() {
  if (child) {
    return;
  }
  child = spawn("pnpm", ["run", "start"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development" },
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[dev] server exited with signal ${signal}`);
    } else {
      console.log(`[dev] server exited with code ${code}`);
    }
    child = null;
  });
}

function stopServer() {
  if (!child) return;
  child.kill("SIGTERM");
}

function restartServer(reason) {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }
  restartTimer = setTimeout(() => {
    console.log(`[dev] restarting server due to ${reason}`);
    stopServer();
    const waitForStop = () => {
      if (!child) {
        startServer();
        return;
      }
      setTimeout(waitForStop, 50);
    };
    waitForStop();
  }, 100);
}

startServer();

try {
  const watcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    if (!/\.(ts|js|json|env)$/i.test(filename)) return;
    restartServer(`${eventType} ${filename}`);
  });
  watcher.on("error", (err) => {
    console.warn(`[dev] watcher error: ${err?.message ?? err}`);
  });
  console.log(`[dev] watching ${srcDir}`);
} catch (err) {
  console.warn(`[dev] failed to start recursive watcher: ${err?.message ?? err}`);
  console.warn("[dev] file changes will not trigger automatic restarts");
}

const cleanup = () => {
  stopServer();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
