import api from "./be/api";
import { setMenu } from "./be/menu";
import settings from "./setting.json";
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const pty = require("node-pty");
const chokidar = require("chokidar");
const shell = "bash";
Object.keys(api).forEach((name) => {
  ipcMain.handle(name, api[name]);
});

let mainWindow;
const fs = require("fs");

function walk(directoryPath, indent = 0, result = []) {
  const files = fs.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    const item = { id: filePath, label: file, indent };
    result.push(item);
    const stats = fs.statSync(filePath);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
      item.nodes = [];
      walk(filePath, indent + 2, item.nodes);
    }
  });
  result.sort((a, b) => {
    const av = a.nodes ? -10000 : 0;
    const bv = b.nodes ? -10000 : 0;
    return av - bv + a.label.localeCompare(b.label);
  });
  return result;
}
const rootDir = process.argv[1] || path.resolve(".");
let dirtyTime
const updateFiles = () => {
  dirtyTime = new Date().getTime()
  setTimeout(() => {
    if (new Date().getTime() - dirtyTime > 800) {
      if (!mainWindow) return;
      const result = walk(rootDir);
      mainWindow.webContents.send("files", result);    
    }
  }, 1000);
};
const w = chokidar.watch(rootDir, { persistent: true });
w.on("ready", () => {
  setTimeout(() => {
    w.on("add", updateFiles);
    w.on("unlink", updateFiles);
    w.on("addDir", updateFiles);
    w.on("unlinkDir", updateFiles);
  }, 3000);
});
ipcMain.on("refresh", () => {
  updateFiles();
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  // setMenu();
  mainWindow = new BrowserWindow({
    width: settings.size.width + 2,
    height: settings.size.height + 2 + 28,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      experimentalFeatures: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.setMenu(null)
  mainWindow.setMenuBarVisibility(false)

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: rootDir,
    env: process.env,
  });

  ptyProcess.on("data", function (data) {
    mainWindow.webContents.send("from-term", data);
  });

  ipcMain.on("to-term", (e, data) => {
    ptyProcess.write(data);
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
