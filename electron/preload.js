const { contextBridge, ipcRenderer } = require("electron");

// Expose safe desktop POS APIs to window.electronAPI
contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  platform: process.platform,
  
  // Silent Thermal Printing for Receipts
  printSilent: (options = {}) => ipcRenderer.invoke("print-silent", options),
  
  // Get List of System Printers (USB, Network, Thermal)
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  
  // Window Controls
  toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),
  
  // App Version
  getVersion: () => ipcRenderer.invoke("get-app-version"),
});
