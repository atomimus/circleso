import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:https";
import path from "node:path";
import { build } from "esbuild";

type Seen = {
  method: string;
  pathname: string;
  query: URLSearchParams;
  headers: IncomingHttpHeaders;
  body: string;
};

export async function browserFixture(consumer: string) {
  assert.ok(path.isAbsolute(consumer));
  const scripts = new Map<string, string>();
  for (const [name, contents] of [
    ["member", await readFile("scripts/fixtures/acceptance/browser.mjs", "utf8")],
    ["guards", await readFile("scripts/fixtures/acceptance/guards.mjs", "utf8")],
  ] as const) {
    const result = await build({
      stdin: { contents, resolveDir: consumer, sourcefile: `${name}.js` },
      bundle: true,
      platform: "browser",
      target: "es2022",
      format: "iife",
      treeShaking: true,
      metafile: true,
      write: false,
      logLevel: "silent",
    });
    assert.ok(result.metafile);
    for (const output of Object.values(result.metafile.outputs))
      assert.deepEqual(output.imports, []);
    const outputFile = result.outputFiles[0];
    assert.ok(outputFile);
    const code = outputFile.text;
    assert.ok(!/\bBuffer\b|node:/.test(code), "Browser bundle requires a Node runtime");
    if (name === "member")
      assert.ok(
        !/function (?:createAdmin|createAuth)|\/api\/admin\/v2\//.test(code),
        "Server surfaces retained in Member bundle",
      );
    scripts.set(`/${name}.js`, code);
  }
  const tls = {
    key: await readFile("scripts/fixtures/acceptance/test-key.pem"),
    cert: await readFile("scripts/fixtures/acceptance/test-cert.pem"),
  };
  const seen: Seen[] = [];
  let appOrigin = "";
  let apiOrigin = "";
  const serve = async (request: IncomingMessage, response: ServerResponse) => {
    assert.ok(request.url && request.method);
    const url = new URL(request.url, "https://localhost");
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    seen.push({
      method: request.method,
      pathname: url.pathname,
      query: url.searchParams,
      headers: request.headers,
      body: Buffer.concat(chunks).toString(),
    });
    if (!url.pathname.startsWith("/deny-cors")) {
      response.setHeader("Access-Control-Allow-Origin", appOrigin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
      response.setHeader(
        "Access-Control-Allow-Headers",
        "authorization, content-type, content-md5",
      );
      response.setHeader("Access-Control-Expose-Headers", "x-request-id, set-cookie");
      response.setHeader("Vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/") {
      response.setHeader("Content-Type", "text/html");
      response.setHeader(
        "Content-Security-Policy",
        `default-src 'none'; script-src 'self'; worker-src 'self'; connect-src ${appOrigin} ${apiOrigin}`,
      );
      response.end(
        '<!doctype html><title>Synthetic SDK acceptance</title><script src="/member.js"></script><script src="/guards.js"></script>',
      );
    } else if (scripts.has(url.pathname)) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(scripts.get(url.pathname));
    } else if (url.pathname === "/worker.js" || url.pathname === "/module-worker.js") {
      response.setHeader("Content-Type", "text/javascript");
      const imports =
        url.pathname === "/worker.js"
          ? 'importScripts("/member.js", "/guards.js");'
          : 'import "/member.js"; import "/guards.js";';
      response.end(
        `${imports} self.onmessage=async(e)=>{try {const data=await scenarios.member(e.data);postMessage({guard:guard(),...data});}catch{postMessage({failed:true});}};`,
      );
    } else if (url.pathname.startsWith("/slow-headers")) {
      // The SDK must abort; the fixture never completes this response.
    } else if (url.pathname.startsWith("/slow-body") || url.pathname.startsWith("/cancel-body")) {
      response.writeHead(200);
      response.write('{"records":[');
    } else if (url.pathname.startsWith("/unauthorized")) {
      response.setHeader("X-Request-Id", "synthetic-401");
      response.writeHead(401);
      response.end("false");
    } else if (url.pathname === "/cookie-echo") {
      response.end(
        JSON.stringify({ present: /synthetic_session=/.test(request.headers.cookie ?? "") }),
      );
    } else if (url.pathname.endsWith("/cookies")) {
      response.setHeader("X-Request-Id", "synthetic-cookie");
      response.setHeader(
        "Set-Cookie",
        request.method === "DELETE"
          ? "synthetic_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax"
          : "synthetic_session=synthetic; Path=/; Secure; HttpOnly; SameSite=Lax",
      );
      response.end(JSON.stringify({ message: "Synthetic cookies" }));
    } else if (url.pathname.endsWith("/direct_uploads")) {
      const mode = url.pathname.split("/")[1];
      response.end(
        JSON.stringify({
          signed_id: "synthetic-id",
          attachable_sgid: "synthetic-sgid",
          direct_upload: {
            url: `${apiOrigin}/storage/${mode}`,
            headers: { "Content-Type": "text/plain", "Content-MD5": "kAFQmDzST7DWlj99KOF/cg==" },
          },
        }),
      );
    } else if (url.pathname === "/storage/redirect") {
      response.writeHead(307, { Location: `${apiOrigin}/redirect-target` });
      response.end();
    } else if (url.pathname === "/storage/fail") {
      response.writeHead(403);
      response.end('{"message":"Synthetic storage failure"}');
    } else if (url.pathname.startsWith("/storage/")) {
      response.writeHead(204);
      response.end();
    } else if (url.pathname.endsWith("/bookmarks")) {
      const page = Number(url.searchParams.get("page") ?? 1);
      response.end(
        JSON.stringify({
          records: [{ id: page, bookmarkable_type: "Post", bookmarkable_id: page }],
          has_next_page: page < 2,
        }),
      );
    } else {
      response.writeHead(404);
      response.end("{}");
    }
  };
  const servers = [
    createServer(tls, (req, res) => void serve(req, res)),
    createServer(tls, (req, res) => void serve(req, res)),
  ];
  const origins = [];
  for (const server of servers) {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    origins.push(`https://127.0.0.1:${address.port}`);
  }
  assert.ok(origins[0] && origins[1]);
  appOrigin = origins[0];
  apiOrigin = origins[1];
  return {
    appOrigin,
    apiOrigin,
    seen,
    async close() {
      for (const server of servers) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  };
}
