import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

export async function checkBrowser(consumer) {
  for (const entry of ["circleso", "circleso/headless"]) {
    const result = await build({
      stdin: {
        contents: `import {createHeadless, CircleConfigError} from ${JSON.stringify(entry)}; globalThis.probe = {createHeadless, CircleConfigError};`,
        resolveDir: consumer,
        sourcefile: "member-consumer.js",
      },
      bundle: true,
      platform: "browser",
      format: "iife",
      target: "es2022",
      treeShaking: true,
      metafile: true,
      write: false,
      logLevel: "silent",
    });
    const code = result.outputFiles[0].text;
    for (const output of Object.values(result.metafile.outputs))
      assert.deepEqual(output.imports, []);
    assert.ok(!/\bBuffer\b|node:/.test(code), "Browser bundle includes a Node dependency");
    assert.ok(
      !/function (?:createAdmin|createAdminClient|createAuth|createHeadlessAuthClient)|\/api\/admin\/v2\//.test(
        code,
      ),
      "Unused server surfaces were not tree shaken",
    );
    // Only web Fetch globals are present; no Node globals or module loader.
    const context = vm.createContext({
      fetch,
      Request,
      Response,
      Headers,
      AbortController,
      ReadableStream,
      TextEncoder,
      TextDecoder,
      URL,
      URLSearchParams,
      setTimeout,
      clearTimeout,
    });
    vm.runInContext(code, context, { timeout: 1000 });
    const { createHeadless, CircleConfigError } = context.probe;
    assert.throws(() => createHeadless({ accessToken: "" }), CircleConfigError);
    const member = createHeadless({
      accessToken: "fixture-browser",
      fetcher: async (request) => {
        assert.equal(request.headers.get("authorization"), "Bearer fixture-browser");
        return Response.json({ records: [] });
      },
    });
    // JSON is parsed inside the VM; compare data without cross-realm prototype identity.
    assert.equal(JSON.stringify(await member.bookmarks.list()), '{"records":[]}');
    console.log(
      `Browser bundle: ${entry}; no Node imports/globals; unused Admin/Auth removed; Member call passes (${code.length} bytes)`,
    );
  }
}

if (process.argv[2]) await checkBrowser(process.argv[2]);
