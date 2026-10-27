import path from "node:path";
import { build, defineConfig, type Options } from "tsup";

export const packageBuildOptions: Options = {
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
  target: "es2022",
  noExternal: ["@noble/hashes"],
  // One canonical class module keeps instanceof valid across entry points AND import/require.
  // It contains no Node APIs; browser bundlers can include this small CommonJS module.
  esbuildPlugins: [
    {
      name: "shared-error-constructors",
      setup(builder) {
        builder.onResolve({ filter: /(?:^|\/)errors$/ }, (args) => {
          if (path.resolve(args.resolveDir, args.path) === path.resolve("src/core/errors")) {
            return { path: "./errors.cjs", external: true };
          }
          return undefined;
        });
      },
    },
  ],
  async onSuccess() {
    await build({
      config: false,
      entry: { errors: "src/core/errors.ts" },
      outDir: "dist",
      format: ["cjs"],
      target: "es2022",
      sourcemap: true,
      clean: false,
      splitting: false,
      outExtension: () => ({ js: ".cjs" }),
    });
  },
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
};

export default defineConfig(packageBuildOptions);
