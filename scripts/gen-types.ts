import { checkArgs, cli, generate } from "./spec-tools";

cli(async () => {
  const args = checkArgs(["--check"]);
  await generate(process.cwd(), args.includes("--check"));
  console.log(
    args.includes("--check")
      ? "Generated types are current (offline)."
      : "Generated types updated from committed specs (offline).",
  );
});
