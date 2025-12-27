import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";

const devServerUrl = "http://localhost:5173";

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
