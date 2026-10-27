import { checkLiveSpecs, syncSpecs } from "./spec-download";
import { checkArgs, cli, failure } from "./spec-tools";

cli(async () => {
  const args = checkArgs(["--check"]);
  if (args.includes("--check")) {
    const report = await checkLiveSpecs(process.cwd());
    if (report)
      throw failure(
        `Upstream spec/type drift. Inspect candidate files and patches at ${report}\nNo tracked files changed. Deliberately accept with npm run spec:sync, then npm run gen:types and review.`,
      );
    console.log("Official specs and candidate types match the committed inputs/outputs.");
  } else {
    await syncSpecs(process.cwd());
    console.log(
      "All official specs validated and synced. Run npm run gen:types and inspect the diff.",
    );
  }
});
