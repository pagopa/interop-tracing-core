import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  test: {
    clearMocks: true,
    globals: true,
    setupFiles: ["dotenv/config"],
    hookTimeout: 20000,
  },
  resolve: {
    alias: [{ find: "~", replacement: resolve(__dirname, "src") }],
  },
});
