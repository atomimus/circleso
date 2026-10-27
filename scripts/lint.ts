import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CircleConfigError } from "../src/core/errors";

const biome = createRequire(import.meta.url).resolve("@biomejs/biome/bin/biome");

/** Check tracked working-tree contents, including staged additions, without reading private files. */
function lint(root: string): number {
  let tracked: Buffer;
  try {
    tracked = execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: root });
  } catch (cause) {
    const error = new CircleConfigError(
      "Unable to list tracked files; run lint in the Git checkout",
    );
    Object.defineProperty(error, "cause", { value: cause });
    throw error;
  }
  const files = tracked
    .toString("utf8")
    .split("\0")
    .filter((file) => file && existsSync(path.join(root, file)));
  // Bound argv size on Windows; Biome decides which tracked file formats/config exclusions apply.
  for (let start = 0; start < files.length; start += 50) {
    const result = spawnSync(
      process.execPath,
      [
        biome,
        "check",
        "--files-ignore-unknown=true",
        "--no-errors-on-unmatched",
        ...files.slice(start, start + 50),
      ],
      { cwd: root, stdio: "inherit", shell: false },
    );
    if (result.error) {
      const error = new CircleConfigError("Unable to start the installed Biome; run npm ci");
      Object.defineProperty(error, "cause", { value: result.error });
      throw error;
    }
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = lint(process.cwd());
  } catch (cause) {
    console.error(
      cause instanceof CircleConfigError ? cause.message : "Lint failed; check Git and npm ci",
    );
    process.exitCode = 1;
  }
}
