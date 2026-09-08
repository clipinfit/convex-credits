import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const convexVersion = process.env.CREDITS_TEST_CONVEX_VERSION ?? "1.42.1";
const temporary = mkdtempSync(join(tmpdir(), "convex-credits-install-"));
function run(command, args, cwd = temporary) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
try {
  const [pack] = JSON.parse(
    run(
      "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", temporary],
      process.cwd(),
    ),
  );
  writeFileSync(
    join(temporary, "package.json"),
    JSON.stringify({
      name: "credits-installed-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@clipin/convex-credits": `file:./${pack.filename}`,
        convex: convexVersion,
      },
      devDependencies: {
        "convex-test": "0.0.54",
        vitest: "4.1.10",
        vite: "8.2.1",
        typescript: "5.9.3",
        "@edge-runtime/vm": "5.0.0",
      },
    }),
  );
  const example = resolve("../example-backend");
  cpSync(join(example, "convex"), join(temporary, "convex"), {
    recursive: true,
  });
  cpSync(
    join(example, "vitest.config.ts"),
    join(temporary, "vitest.config.ts"),
  );
  writeFileSync(
    join(temporary, "convex/convex.config.ts"),
    'import { defineApp } from "convex/server";\nimport credits from "@clipin/convex-credits/convex.config.js";\nconst app = defineApp();\napp.use(credits);\nexport default app;\n',
  );
  // The copied host types refer to the development source. The installed consumer uses the public export.
  const apiPath = join(temporary, "convex/_generated/api.d.ts");
  writeFileSync(
    apiPath,
    readFileSync(apiPath, "utf8").replaceAll(
      "../../../convex-credits/src/component/_generated/component.js",
      "@clipin/convex-credits/_generated/component.js",
    ),
  );
  run("bun", ["install"]);
  assert.equal(
    JSON.parse(
      readFileSync(join(temporary, "node_modules/convex/package.json"), "utf8"),
    ).version,
    convexVersion,
  );
  const imports = run("node", [
    "--input-type=module",
    "-e",
    'import { Credits } from "@clipin/convex-credits"; import config from "@clipin/convex-credits/convex.config.js"; import alias from "@clipin/convex-credits/convex.config"; if (typeof Credits !== "function" || config !== alias) throw new Error("Invalid exports"); console.log("exports passed");',
  ]);
  assert.match(imports, /exports passed/);
  run("bunx", [
    "--no-install",
    "tsc",
    "--noEmit",
    "-p",
    "convex/tsconfig.json",
  ]);
  const tests = run("bunx", ["--no-install", "vitest", "run"]);
  assert.match(tests, /2 passed/);
  // Keep the component at the root and convex-test in a nested workspace.
  // This is the layout that exposed the test helper's unnecessary type dependency.
  const backend = join(temporary, "packages/backend");
  mkdirSync(backend, { recursive: true });
  cpSync(join(temporary, "convex"), join(backend, "convex"), {
    recursive: true,
  });
  cpSync(
    join(temporary, "vitest.config.ts"),
    join(backend, "vitest.config.ts"),
  );
  const manifest = JSON.parse(
    readFileSync(join(temporary, "package.json"), "utf8"),
  );
  writeFileSync(
    join(backend, "package.json"),
    JSON.stringify({
      name: "credits-nested-test-consumer",
      private: true,
      type: "module",
      dependencies: { convex: convexVersion },
      devDependencies: manifest.devDependencies,
    }),
  );
  manifest.workspaces = ["packages/*"];
  manifest.devDependencies = { vite: "8.2.1", typescript: "5.9.3" };
  writeFileSync(join(temporary, "package.json"), JSON.stringify(manifest));
  rmSync(join(temporary, "node_modules"), { recursive: true, force: true });
  run("npm", [
    "install",
    "--install-strategy=nested",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
  assert.equal(existsSync(join(temporary, "node_modules/convex-test")), false);
  assert.equal(existsSync(join(backend, "node_modules/convex-test")), true);
  run(
    "bunx",
    ["--no-install", "tsc", "--noEmit", "-p", "convex/tsconfig.json"],
    backend,
  );
  assert.match(
    run("bunx", ["--no-install", "vitest", "run"], backend),
    /2 passed/,
  );
  console.log(
    `Installed tarball passed with Convex ${convexVersion}: runtime exports, host types, packaged test helper, nested npm workspace, scheduled completion, and host rollback.`,
  );
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
