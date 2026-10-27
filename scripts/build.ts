import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { build } from "tsup";
import { packageBuildOptions } from "../tsup.config";

// tsup preserves old declarations when clean + dts are enabled. Remove the entire owned
// output first so renamed declaration chunks from an earlier build cannot enter the tarball.
const output = path.resolve("dist");
assert.equal(path.dirname(output), process.cwd());
assert.equal(path.basename(output), "dist");
await rm(output, { recursive: true, force: true });
await build({ ...packageBuildOptions, config: false });
