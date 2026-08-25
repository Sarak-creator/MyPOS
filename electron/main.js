try { require("../fix-fat32.js"); } catch (_) {}

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");

let mainWindow = null;
let nextServerProcess = null;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const PORT = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Load .env from the correct location (packaged or dev)
// ─────────────────────────────────────────────────────────────────────────────
function loadEnvFile() {
  // In packaged app, __dirname = <install>/resources/app/electron/
  // .env is at <install>/resources/app/.env
  const envPaths = [
    path.join(__dirname, "..", ".env"),                     // packaged: resources/app/.env
    path.join(process.resourcesPath || "", "app", ".env"), // alt packaged path
    path.join(process.cwd(), ".env"),                      // dev fallback
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      console.log("[Electron] Loaded .env from:", envPath);
      return envPath;
    }
  }
  console.warn("[Electron] WARNING: No .env file found!");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Collect all env vars to pass to child Next.js process
// ─────────────────────────────────────────────────────────────────────────────
function buildEnvForServer(envFilePath) {
  const env = { ...process.env };

  // If .env file found, also read it and overlay into env object
  if (envFilePath && fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }

  env.PORT = String(PORT);
  env.NODE_ENV = "production";
  return env;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Start Next.js production server as a child process
// ─────────────────────────────────────────────────────────────────────────────
function startProductionServer(envFilePath) {
  return new Promise((resolve, reject) => {
    // First check if a server is already running on PORT
    const checkReq = http.get(`http://localhost:${PORT}`, () => {
      console.log("[Electron] Server already running on port", PORT);
      resolve();
    });

    checkReq.setTimeout(1000);
    checkReq.on("error", () => {
      // Server not running — spawn it
      const appDir = path.join(__dirname, "..");
      const env = buildEnvForServer(envFilePath);

      // In packaged app, .next is mapped to resources/app/.next by electron-builder
      // We must tell Next.js where distDir is
      env.NEXT_DIST_DIR = path.join(appDir, ".next");

      // Find node executable
      const nodeBin = process.execPath; // Electron's node
      // Use next's CLI script
      const nextScript = path.join(appDir, "node_modules", "next", "dist", "bin", "next");

      if (!fs.existsSync(nextScript)) {
        console.error("[Electron] next bin not found at:", nextScript);
        reject(new Error("next bin not found"));
        return;
      }

      console.log("[Electron] Spawning Next.js server...");
      nextServerProcess = spawn(
        nodeBin,
        [nextScript, "start", "--port", String(PORT)],
        {
          cwd: appDir,
          env,
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      nextServerProcess.stdout.on("data", (data) => {
        const msg = data.toString();
        console.log("[NextServer]", msg.trim());
        // Resolve when server is ready
        if (msg.includes("Ready") || msg.includes("started") || msg.includes(String(PORT))) {
          resolve();
        }
      });

      nextServerProcess.stderr.on("data", (data) => {
        const msg = data.toString();
        console.error("[NextServer ERR]", msg.trim());
        // Still resolve after stderr — errors may be non-fatal warnings
        if (msg.includes("Ready") || msg.includes(String(PORT))) {
          resolve();
        }
      });

      nextServerProcess.on("error", (err) => {
        console.error("[Electron] Failed to spawn Next.js:", err);
        reject(err);
      });

      nextServerProcess.on("close", (code) => {
        console.warn("[Electron] Next.js server exited with code:", code);
      });

      // Fallback: poll until server responds (max 30s)
      let attempts = 0;
      const maxAttempts = 60;
      const poll = setInterval(() => {
        attempts++;
        const req = http.get(`http://localhost:${PORT}`, (res) => {
          clearInterval(poll);
          console.log("[Electron] Server ready on port", PORT);
          resolve();
        });
        req.on("error", () => {});
        req.setTimeout(500);
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          console.warn("[Electron] Server poll timed out, loading anyway...");
          resolve();
        }
      }, 500);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Create BrowserWindow
// ─────────────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    title: "អាណាចក្រPOS - Enterprise POS & ERP System",
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  const startUrl = `http://localhost:${PORT}`;

  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    const envFilePath = loadEnvFile();
    startProductionServer(envFilePath)
      .then(() => {
        mainWindow.loadURL(startUrl);
      })
      .catch((err) => {
        console.error("Server failed to start:", err);
        mainWindow.loadURL(startUrl); // try anyway
      });
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // F11 Fullscreen toggle
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11" && input.type === "keyDown") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. IPC Handlers (Printing, Window Controls)
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle("print-silent", async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: "Main window not found" };
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: options.silent ?? true,
        printBackground: true,
        deviceName: options.deviceName || "",
        pageSize: options.pageSize || { width: 80000, height: 297000 },
        margins: { marginType: "none" },
      },
      (success, failureReason) => {
        if (!success) {
          console.error("Print failed:", failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle("get-printers", async () => {
  if (!mainWindow) return [];
  return mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle("toggle-fullscreen", () => {
  if (mainWindow) {
    const isFull = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFull);
    return !isFull;
  }
  return false;
});

ipcMain.handle("window-minimize", () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle("window-close", () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle("get-app-version", () => app.getVersion());

// ─────────────────────────────────────────────────────────────────────────────
// 6. App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Pre-load .env in dev mode too
  if (!isDev) loadEnvFile();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Kill Next.js server when app closes
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
