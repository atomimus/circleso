import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    admin: "src/admin.ts",
    headless: "src/headless.ts",
    auth: "src/auth.ts",
  },
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "node18",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
