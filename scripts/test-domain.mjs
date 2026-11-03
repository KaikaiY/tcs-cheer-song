// Compile only pure domain modules into an isolated temporary directory, then use Node's built-in runner.
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
const directory = mkdtempSync(join(tmpdir(), "tcs-tests-"));
const files = [
  "tests/domain.test.ts",
  "lib/validation.ts",
  "lib/api.ts",
  "lib/types.ts",
  "lib/questions.ts",
  "lib/providers/mock-brief.ts",
  "lib/prompt-format.ts",
];
for (const file of files) {
  const output = join(directory, file.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(output), { recursive: true });
  const source = readFileSync(file, "utf8").replace(
    /(from\s+['"][^'"]+)\.ts(['"])/g,
    "$1.js$2",
  );
  writeFileSync(
    output,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
  );
}
execFileSync(
  process.execPath,
  ["--test", join(directory, "tests/domain.test.js")],
  { stdio: "inherit" },
);
