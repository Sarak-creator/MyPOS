const config = {
  appId: "com.anachak.pos",
  appName: "អាណាចក្រPOS",
  webDir: "public",
  server: {
    url: "http://localhost:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
