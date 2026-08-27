import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.anachak.pos",
  appName: "អាណាចក្រPOS",
  webDir: "public",
  server: {
    url: "https://anajakpos.vercel.app",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
