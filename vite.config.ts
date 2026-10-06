import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

const mobileDevHost = process.env.TAURI_DEV_HOST;
const root = resolve(__dirname);

function resolveAppBuild(): string {
  if (process.env.SKILLFORGE_BUILD?.trim()) return process.env.SKILLFORGE_BUILD.trim();
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/** Prefer RELEASE_LABEL (RepoPact 2.3 decision 0026); fall back to package.json. */
function resolveAppVersion(): string {
  const labelPath = resolve(root, "RELEASE_LABEL");
  if (existsSync(labelPath)) {
    const label = readFileSync(labelPath, "utf8").trim();
    if (label) return label;
  }
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version?: string };
  return pkg.version ?? "0.0.0";
}

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
    __APP_BUILD__: JSON.stringify(resolveAppBuild())
  },
  server: {
    host: mobileDevHost || false,
    port: 1420,
    strictPort: true,
    hmr: mobileDevHost
      ? {
          protocol: "ws",
          host: mobileDevHost,
          port: 1421
        }
      : undefined
  },
  envPrefix: ["VITE_", "TAURI_"],
  // The Tauri build copies src/content (incl. test files) under src-tauri/target;
  // keep the test runner out of those generated copies.
  test: { exclude: [...configDefaults.exclude, "src-tauri/**"] },
  build: {
    target: ["es2021", "chrome100", "safari13"],
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\\\", "/");
          if (normalizedId.includes("/src/content/a-plus/")) return "content-a-plus";
          if (normalizedId.includes("/src/content/network-plus/")) return "content-network-plus";
          if (normalizedId.includes("/src/content/security-plus/")) return "content-security-plus";
          if (normalizedId.includes("node_modules/lucide-react")) return "icons";
          if (normalizedId.includes("node_modules/recharts") || normalizedId.includes("node_modules/d3-") ||
              normalizedId.includes("node_modules/react-smooth") || normalizedId.includes("node_modules/decimal.js-light")) {
            return "charts";
          }
        }
      }
    }
  }
});
