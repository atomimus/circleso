import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/** Only Git-owned working files: never inspect unrelated untracked examples. */
export function documentationFiles(root: string): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "*.md"], { cwd: root })
    .toString()
    .split("\0")
    .filter(Boolean)
    .sort();
}

export function typescriptBlocks(source: string): { source: string; extension: "mts" | "cts" }[] {
  const blocks: { source: string; extension: "mts" | "cts" }[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const opening = /^\s*(`{3,}|~{3,})([^\s`]*).*$/i.exec(lines[i] ?? "");
    if (!opening) continue;
    const fence = opening[1] ?? "";
    const language = (opening[2] ?? "").toLowerCase();
    const body: string[] = [];
    let closed = false;
    while (++i < lines.length) {
      if (new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(lines[i] ?? "")) {
        closed = true;
        break;
      }
      body.push(lines[i] ?? "");
    }
    if (!closed) throw new Error("Unclosed documentation fence");
    if (["ts", "typescript", "mts", "cts", "tsx"].includes(language)) {
      if (language === "tsx") throw new Error("TSX examples require an explicit compiler fixture");
      blocks.push({ source: body.join("\n"), extension: language === "cts" ? "cts" : "mts" });
    }
  }
  return blocks;
}

export function headingIds(source: string): Set<string> {
  const counts = new Map<string, number>();
  return new Set(
    source
      .replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, "")
      .split(/\r?\n/)
      .flatMap((line) => {
        const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)?.[1];
        if (!heading) return [];
        const base = heading
          .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
          .replace(/<[^>]*>/g, "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "")
          .replace(/\s/g, "-");
        const count = counts.get(base) ?? 0;
        counts.set(base, count + 1);
        return [count ? `${base}-${count}` : base];
      }),
  );
}

export function markdownLinks(source: string): string[] {
  const prose = source.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, "");
  return [
    ...[...prose.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)].map(
      (match) => match[1] ?? "",
    ),
    ...[...prose.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm)].map((match) => match[1] ?? ""),
  ].map((href) => href.replace(/^<|>$/g, ""));
}

export async function checkDocumentationLinks(root: string, files: string[]): Promise<number> {
  let count = 0;
  for (const file of files) {
    const source = await readFile(path.join(root, file), "utf8");
    for (let href of markdownLinks(source)) {
      const repository =
        /^https:\/\/github\.com\/atomimus\/circleso\/(?:blob|tree)\/main\/(.+)$/.exec(href);
      if (repository?.[1])
        href = path.relative(path.dirname(file), repository[1]).replaceAll("\\", "/");
      if (/^[a-z][\w+.-]*:/i.test(href) || href.startsWith("//")) continue;
      const [pathname = "", hash = ""] = href.split("#", 2);
      const target = pathname
        ? path.resolve(path.dirname(path.join(root, file)), decodeURIComponent(pathname))
        : path.join(root, file);
      const relative = path.relative(root, target).replaceAll("\\", "/");
      if (relative.startsWith("../") || relative.split("/").includes("v1-release"))
        throw new Error(`${file}: link outside public documentation: ${href}`);
      const info = await stat(target).catch(() => undefined);
      if (!info) throw new Error(`${file}: broken link ${href}`);
      if (hash && target.endsWith(".md")) {
        const ids = headingIds(await readFile(target, "utf8"));
        if (!ids.has(decodeURIComponent(hash))) throw new Error(`${file}: broken anchor ${href}`);
      }
      count++;
    }
  }
  return count;
}
