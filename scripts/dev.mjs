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

const child = spawn(
  "pnpm",
  [
    "exec",
    "concurrently",
    "-k",
    "-n",
    "api,web,desktop",
    "-c",
    "green,cyan,magenta",
    "pnpm --filter @calendar/api dev",
    "pnpm --filter @calendar/web dev",
    "pnpm --filter @calendar/desktop dev"
  ],
  { stdio: "inherit", env }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
