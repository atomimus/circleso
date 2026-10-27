import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "circleso/headless": fileURLToPath(new URL("./src/headless.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
