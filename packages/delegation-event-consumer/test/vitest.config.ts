import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  test: {
    clearMocks: true,
    globals: true,
    include: ["test/**/*.test.ts"],
    setupFiles: ["dotenv-flow/config"],
  },
  resolve: {
    alias: [{ find: "~", replacement: resolve(__dirname, "src") }],
  },
});
