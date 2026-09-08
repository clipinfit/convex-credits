import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const metadata = JSON.parse(readFileSync("package.json", "utf8"));
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    encoding: "utf8",
  }),
);
const paths = new Set(pack.files.map((file) => file.path));
for (const path of [
  "dist/client/index.js",
  "dist/client/index.d.ts",
  "dist/component/convex.config.js",
  "dist/component/_generated/component.d.ts",
  "src/test.ts",
  "LICENSE",
  "NOTICE",
  "README.md",
  "CHANGELOG.md",
])
  assert(paths.has(path), `Missing ${path}`);
for (const path of paths)
  assert(
    !/(\.env|\.test\.ts|node_modules|\.tgz$)/.test(path),
    `Unexpected file: ${path}`,
  );
assert.equal(metadata.name, "@clipin/convex-credits");
console.log(
  `Package contents verified: ${paths.size} files, ${pack.unpackedSize} bytes.`,
);
