import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const specsDir = path.join(root, "api", "specs");
const configPath = path.join(specsDir, "sources.json");

const configRaw = await readFile(configPath, "utf8");
const config = JSON.parse(configRaw);
const specs = Array.isArray(config.specs) ? config.specs : [];

if (specs.length === 0) {
  throw new Error("No specs configured. Add entries to api/specs/sources.json.");
}

await mkdir(specsDir, { recursive: true });

for (const [index, spec] of specs.entries()) {
  if (!spec || typeof spec.url !== "string") {
    throw new Error(`Spec entry at index ${index} is missing a url.`);
  }

  const name = typeof spec.name === "string" ? spec.name : `spec-${index + 1}`;
  const fileName = toFileName(name) || `spec-${index + 1}`;
  const ext = resolveExtension(spec.url);
  const outputPath = path.join(specsDir, `${fileName}${ext}`);

  const response = await fetch(spec.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${spec.url}: ${response.status} ${response.statusText}`);
  }

  const contents = await response.text();
  await writeFile(outputPath, contents, "utf8");
  console.log(`Downloaded ${spec.url} -> ${path.relative(root, outputPath)}`);
}

function toFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext === ".yaml" || ext === ".yml" || ext === ".json") {
      return ext;
    }
  } catch {
    // fall through to default
  }

  return ".yaml";
}
