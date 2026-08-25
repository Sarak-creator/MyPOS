import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build .next to NTFS temp to avoid FAT32 EPERM file-locking errors.
// NEXT_DIST_DIR must be set externally as an absolute path before running next build.
const distDir = process.env.NEXT_DIST_DIR
  ? process.env.NEXT_DIST_DIR          // absolute NTFS path set by build script
  : ".next";                            // default for dev mode (stays on FAT32 drive is fine for dev)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  distDir,
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  webpack: (config, { dev }) => {
    config.resolve.symlinks = false;
    config.cache = false;
    if (dev) {
      config.infrastructureLogging = {
        level: "error",
      };
    }
    return config;
  },
};

export default nextConfig;
