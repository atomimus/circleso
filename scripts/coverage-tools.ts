import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { CHAT_IMPORT_PATH, MISSING_CHAT_SCHEMA } from "./spec-overrides";
import {
  failure,
  generatedFile,
  type JsonObject,
  loadSpecs,
  METHODS,
  object,
  parseSpec,
  specFile,
} from "./spec-tools";

export type Operation = { method: string; path: string; summary: string };
export type Wrapper = { method: string; path: string; name: string; file: string };
export type Surface = {
  name: string;
  module: string;
  source: string;
  sha256: string;
  operations: (Operation & {
    raw: boolean;
    wrappers: Wrapper[];
    limitations: string[];
    task: number | null;
  })[];
};

const key = (method: string, route: string) => `${method.toUpperCase()} ${route}`;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function operations(doc: JsonObject): Operation[] {
  const result: Operation[] = [];
  for (const [route, item] of Object.entries(doc.paths as JsonObject)) {
    if (!object(item)) continue;
    for (const method of METHODS) {
      const operation = item[method];
      if (object(operation))
        result.push({
          method: method.toUpperCase(),
          path: route,
          summary: String(operation.summary ?? ""),
        });
    }
  }
  return result.sort((a, b) => compare(key(a.method, a.path), key(b.method, b.path)));
}

function sourceFile(text: string): ts.SourceFile {
  return ts.createSourceFile("inventory.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Count real operations, excluding optional never placeholders emitted by openapi-typescript. */
export function rawOperations(text: string): Set<string> {
  const ast = sourceFile(text);
  const paths = ast.statements.find(
    (node): node is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(node) && node.name.text === "paths",
  );
  if (!paths) throw failure("Generated declaration has no paths interface");
  const result = new Set<string>();
  for (const route of paths.members) {
    if (
      !ts.isPropertySignature(route) ||
      !route.type ||
      !ts.isTypeLiteralNode(route.type) ||
      !ts.isStringLiteral(route.name)
    )
      throw failure("Unsupported generated paths shape");
    for (const method of route.type.members) {
      if (!ts.isPropertySignature(method) || !method.type) continue;
      const name = method.name.getText(ast).replaceAll('"', "");
      if (
        !(METHODS as readonly string[]).includes(name) ||
        method.type.kind === ts.SyntaxKind.NeverKeyword
      )
        continue;
      result.add(key(name, route.name.text));
    }
  }
  return result;
}

function returnedObject(node: ts.Node): ts.ObjectLiteralExpression | undefined {
  if (ts.isBlock(node)) {
    const statement = node.statements.find(ts.isReturnStatement);
    if (statement?.expression && ts.isObjectLiteralExpression(statement.expression))
      return statement.expression;
  }
  return undefined;
}

/** Follow public facade registrations and the returned resource objects, ignoring comments and dead helpers. */
export async function wrappers(
  indexText: string,
  load: (relative: string) => Promise<string>,
): Promise<Wrapper[]> {
  const index = sourceFile(indexText);
  const imports = new Map<string, string>();
  for (const node of index.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      !node.moduleSpecifier.text.startsWith("./resources/")
    )
      continue;
    const bindings = node.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) throw failure("Unsupported resource import");
    for (const binding of bindings.elements)
      imports.set(binding.name.text, node.moduleSpecifier.text);
  }
  const result: Wrapper[] = [];
  const seen = new Set<string>();
  for (const node of index.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.body) continue;
    const returned = returnedObject(node.body);
    if (!returned) continue;
    for (const property of returned.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !ts.isCallExpression(property.initializer) ||
        !ts.isIdentifier(property.initializer.expression)
      )
        continue;
      const factory = property.initializer.expression.text;
      const resource = imports.get(factory);
      if (!resource) continue;
      const resourceFile = `${resource.slice(2)}.ts`;
      const resourceAst = sourceFile(await load(`${resource}.ts`));
      const declaration = resourceAst.statements.find(
        (item): item is ts.FunctionDeclaration =>
          ts.isFunctionDeclaration(item) && item.name?.text === factory,
      );
      const body = declaration?.body && returnedObject(declaration.body);
      if (!body) throw failure(`Cannot inventory returned object for ${factory}`);
      const request = declaration?.parameters[0]?.name.getText(resourceAst);
      function visitObject(value: ts.ObjectLiteralExpression, prefix: string): void {
        for (const member of value.properties) {
          if (!ts.isPropertyAssignment(member))
            throw failure(`Unsupported facade member in ${resource}`);
          const name = `${prefix}.${member.name.getText(resourceAst).replaceAll('"', "")}`;
          if (ts.isObjectLiteralExpression(member.initializer)) {
            visitObject(member.initializer, name);
            continue;
          }
          if (
            !ts.isArrowFunction(member.initializer) &&
            !ts.isFunctionExpression(member.initializer)
          )
            throw failure(`Unsupported facade implementation ${name}`);
          let calls = 0;
          function visitCall(child: ts.Node): void {
            if (
              ts.isCallExpression(child) &&
              ts.isPropertyAccessExpression(child.expression) &&
              child.expression.expression.getText(resourceAst) === request
            ) {
              const requesterMethod = child.expression.name.text;
              // These two shared requester variants retain metadata for the same operations.
              const method =
                requesterMethod === "postWithResponse"
                  ? "post"
                  : requesterMethod === "deleteWithResponse"
                    ? "delete"
                    : requesterMethod;
              const route = child.arguments[0];
              if (
                !(METHODS as readonly string[]).includes(method) ||
                !route ||
                !ts.isStringLiteral(route)
              )
                throw failure(`Dynamic request cannot be inventoried: ${name}`);
              result.push({
                method: method.toUpperCase(),
                path: route.text,
                name,
                file: resourceFile,
              });
              calls++;
            }
            ts.forEachChild(child, visitCall);
          }
          visitCall(member.initializer.body);
          if (!calls) throw failure(`No requester operation found for ${name}`);
        }
      }
      visitObject(body, property.name.getText(index));
      seen.add(factory);
    }
  }
  if (seen.size !== imports.size)
    throw failure("Unregistered resource import; inventory requires a public facade registration");
  return result;
}

function limitations(doc: JsonObject, operation: Operation): string[] {
  const paths = doc.paths as Record<string, JsonObject>;
  const item = paths[operation.path]?.[operation.method.toLowerCase()] as JsonObject;
  const result: string[] = [];
  for (const [status, response] of Object.entries(item.responses as JsonObject)) {
    if (
      !/^2\d\d$/.test(status) ||
      status === "204" ||
      status === "205" ||
      !object(response) ||
      !object(response.content)
    )
      continue;
    for (const [media, value] of Object.entries(response.content)) {
      if (!object(value)) continue;
      const schema = value.schema;
      const components = doc.components as { schemas?: Record<string, unknown> } | undefined;
      if (
        operation.path === CHAT_IMPORT_PATH &&
        operation.method === "POST" &&
        status === "201" &&
        object(schema) &&
        schema.$ref === `#/components/schemas/${MISSING_CHAT_SCHEMA}` &&
        !Object.hasOwn(components?.schemas ?? {}, MISSING_CHAT_SCHEMA)
      ) {
        result.push(
          `${status} ${media}: unknown (missing upstream ${MISSING_CHAT_SCHEMA}; targeted override)`,
        );
      } else if (
        !object(schema) ||
        Object.keys(schema).every((field) =>
          ["description", "title", "example", "examples"].includes(field),
        )
      ) {
        result.push(`${status} ${media}: unknown (upstream omits a response schema)`);
      }
    }
  }
  return result;
}

// Release-track ownership only, not an assertion about undocumented endpoint behavior.
function owner(route: string): number | null {
  if (/\/(community_member_charges|community_member_subscriptions)(\/|$)/.test(route)) return 12;
  if (
    /\/(paywalls|paywall_groups|paywall_coupons|paywall_affiliates|paywall_affiliate_payouts)(\/|$)/.test(
      route,
    )
  )
    return 13;
  if (/\/(workflows|filter_kit_configuration|filter_kit_controls)(\/|$)/.test(route)) return 14;
  if (
    /\/(contacts|payment_method_setting|tax_setting|settings|community_leads|live|locations|chat_room_message_imports)(\/|$)/.test(
      route,
    )
  )
    return 15;
  return null;
}

export async function inventory(root: string): Promise<Surface[]> {
  const result: Surface[] = [];
  for (const spec of await loadSpecs(root)) {
    const source = await readFile(path.join(root, specFile(spec)), "utf8");
    const doc = parseSpec(source, spec);
    const raw = rawOperations(await readFile(path.join(root, generatedFile(spec)), "utf8"));
    const moduleRoot = path.join(root, "src", spec.module);
    const facade = await wrappers(
      await readFile(path.join(moduleRoot, "index.ts"), "utf8"),
      (file) => readFile(path.join(moduleRoot, file), "utf8"),
    );
    const ops = operations(doc);
    const keys = new Set(ops.map((op) => key(op.method, op.path)));
    const stale = [...raw, ...facade.map((op) => key(op.method, op.path))].filter(
      (op) => !keys.has(op),
    );
    if (stale.length)
      throw failure(`${spec.name}: operations absent from spec: ${stale.join(", ")}`);
    result.push({
      name: spec.name,
      module: spec.module,
      source: spec.url,
      sha256: createHash("sha256").update(source).digest("hex"),
      operations: ops.map((op) => ({
        ...op,
        raw: raw.has(key(op.method, op.path)),
        wrappers: facade.filter(
          (wrapper) => key(wrapper.method, wrapper.path) === key(op.method, op.path),
        ),
        limitations: limitations(doc, op),
        task: owner(op.path),
      })),
    });
  }
  return result;
}

export function report(surfaces: Surface[]): string {
  const lines = [
    "# API operation inventory",
    "",
    "Generated offline by `npm run coverage:write`; verify with `npm run gen:check` and `npm run coverage:check`.",
    "Counts are method/path exposure, not runtime correctness or test coverage. `raw` means a non-never operation in the generated paths interface used by the raw client. Named facade entries follow public resource registrations and requester calls using the TypeScript AST.",
    "",
    "| Surface | Spec operations | Raw exposure | Named facade operations | Raw-only |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];
  for (const surface of surfaces)
    lines.push(
      `| ${surface.name} | ${surface.operations.length} | ${surface.operations.filter((op) => op.raw).length} | ${surface.operations.filter((op) => op.wrappers.length).length} | ${surface.operations.filter((op) => op.raw && !op.wrappers.length).length} |`,
    );
  lines.push(
    "",
    "## Raw-only operations",
    "",
    "Release task ownership follows the saved v1 plan; unassigned new routes need explicit triage.",
    "",
    "| Surface | Method | Path | Task |",
    "| --- | --- | --- | --- |",
  );
  for (const surface of surfaces)
    for (const op of surface.operations.filter((op) => op.raw && !op.wrappers.length))
      lines.push(
        `| ${surface.name} | ${op.method} | \`${op.path}\` | ${op.task ?? "Unassigned"} |`,
      );
  lines.push(
    "",
    "## Untyped success response limitations",
    "",
    "These media types have no authoritative schema or use the one targeted missing-schema override. Responses with no declared content (for example 204) are not schema gaps. This list does not classify every nested free-form property; the generated declarations remain authoritative for those upstream types.",
    "",
    "| Surface | Operation | Limitation |",
    "| --- | --- | --- |",
  );
  for (const surface of surfaces)
    for (const op of surface.operations)
      for (const limitation of op.limitations)
        lines.push(`| ${surface.name} | ${op.method} \`${op.path}\` | ${limitation} |`);
  for (const surface of surfaces) {
    lines.push(
      "",
      `## ${surface.name}`,
      "",
      `Source: ${surface.source}`,
      "",
      `Input SHA-256: \`${surface.sha256}\``,
      "",
      "| Method | Path | Raw | Named facade |",
      "| --- | --- | --- | --- |",
    );
    for (const op of surface.operations)
      lines.push(
        `| ${op.method} | \`${op.path}\` | ${op.raw ? "Yes" : "Missing"} | ${op.wrappers.map((wrapper) => `\`${wrapper.name}\` ([source](https://github.com/atomimus/circleso/blob/main/src/${surface.module}/${wrapper.file}))`).join(", ") || "—"} |`,
      );
  }
  return `${lines.join("\n")}\n`;
}
