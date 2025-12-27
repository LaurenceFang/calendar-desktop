import { spawn } from "node:child_process";
import os from "node:os";
import { join } from "node:path";

const appName = "Calendar Desktop";

const resolveUserDataDir = () => {
  const home = os.homedir();

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    return join(appData, appName);
  }

  if (process.platform === "darwin") {
    return join(home, "Library", "Application Support", appName);
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");
  return join(xdgConfig, appName);
};

const userDataDir = resolveUserDataDir();

const env = {
  ...process.env,
  APP_USER_DATA_DIR: userDataDir
};

const command =
  "npx pnpm --filter @calendar/shared build && " +
  'npx pnpm exec concurrently -k -n api,web,desktop -c "green,cyan,magenta" ' +
  '"npx pnpm --filter @calendar/api dev" ' +
  '"npx pnpm --filter @calendar/web dev" ' +
  '"npx pnpm --filter @calendar/desktop dev"';

const child = spawn(command, {
  shell: true,
  stdio: "inherit",
  env
});

const forwardSignal = (signal) => {
  if (child.killed) {
    return;
  }

  child.kill(signal);
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start dev processes.", error);
  process.exit(1);
});
