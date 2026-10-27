import path from "node:path";
import { inventory, report } from "./coverage-tools";
import { checkArgs, checkOutputs, cli, failure, writeOutputs } from "./spec-tools";

cli(async () => {
  const args = checkArgs(["--check", "--write", "--json"]);
  if (args.length > 1) throw failure("Choose one of --check, --write, --json");
  const data = await inventory(process.cwd());
  const contents = report(data);
  const outputs = [{ file: path.join(process.cwd(), "docs/api-coverage.md"), contents }];
  if (args.includes("--write")) await writeOutputs(outputs);
  else if (args.includes("--check")) await checkOutputs(outputs, "npm run coverage:write");
  else console.log(args.includes("--json") ? JSON.stringify(data, null, 2) : contents);
  if (data.some((surface) => surface.operations.some((operation) => !operation.raw)))
    throw failure("Spec operations are missing from raw generated paths; run npm run gen:types");
});
