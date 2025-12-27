import { app, BrowserWindow } from "electron";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { APP_NAME } from "@calendar/shared";

const devServerUrl = "http://localhost:5173";

app.setName(APP_NAME);

const ensureAppDirectories = () => {
  const userDataDir = app.getPath("userData");
  const directories = ["db", "imports", "exports", "logs"].map((dir) =>
    join(userDataDir, dir)
  );

  for (const directory of directories) {
    mkdirSync(directory, { recursive: true });
  }

  process.env.APP_USER_DATA_DIR = userDataDir;
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js")
    }
  });

  const localIndexPath = join(__dirname, "../../web/dist/index.html");
  const shouldUseLocal = app.isPackaged || existsSync(localIndexPath);

  if (shouldUseLocal) {
    void window.loadFile(localIndexPath);
  } else {
    void window.loadURL(devServerUrl);
  }
};

app.whenReady().then(() => {
  ensureAppDirectories();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
