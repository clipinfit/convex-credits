import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseEnv, promisify } from "node:util";

const exec = promisify(execFile);
const env = parseEnv(
  await readFile(new URL("../.env.local", import.meta.url), "utf8"),
);
assert.ok(
  env.CONVEX_DEPLOYMENT?.startsWith("anonymous:"),
  "Use the anonymous local example deployment",
);
assert.equal(env.CONVEX_URL, "http://127.0.0.1:3210");
assert.ok(
  !env.CONVEX_DEPLOY_KEY && !env.CONVEX_SELF_HOSTED_URL,
  "Refuse nonlocal credentials",
);
const namespace = `integration-${randomUUID()}`;
const scope = { namespace, owner: "alice" };
async function run(name, args) {
  const { stdout } = await exec(
    "bunx",
    [
      "--no-install",
      "convex",
      "run",
      "--env-file",
      ".env.local",
      "--component",
      "credits",
      `credits:${name}`,
      JSON.stringify({ namespace, ...args }),
    ],
    {
      cwd: new URL("..", import.meta.url),
      maxBuffer: 1024 * 1024,
    },
  );
  return JSON.parse(stdout);
}
const grant = {
  ...scope,
  key: "welcome",
  amount: 20,
  reason: "Local integration test",
  reference: namespace,
};
const grants = await Promise.all(
  Array.from({ length: 8 }, () => run("grant", grant)),
);
assert.ok(grants.every((result) => result.movementId === grants[0].movementId));
assert.equal(await run("balance", scope), 20);
const requests = Array.from({ length: 10 }, (_, i) => ({
  ...grant,
  key: `reserve-${i}`,
  amount: 3,
}));
const reservations = await Promise.allSettled(
  requests.map((request) => run("reserve", request)),
);
const successful = reservations.flatMap((result, i) =>
  result.status === "fulfilled"
    ? [{ request: requests[i], result: result.value }]
    : [],
);
assert.equal(successful.length, 6);
for (const failure of reservations.filter(
  (result) => result.status === "rejected",
))
  assert.match(String(failure.reason), /INSUFFICIENT_CREDITS/);
assert.equal(await run("balance", scope), 2);
for (const { request, result } of successful)
  assert.deepEqual(await run("reserve", request), result);
assert.equal(await run("balance", scope), 2);
const chargeId = successful[0].result.chargeId;
const terminal = await Promise.allSettled([
  run("complete", { key: "complete", chargeId }),
  run("release", { key: "release", chargeId }),
]);
assert.equal(
  terminal.filter((result) => result.status === "fulfilled").length,
  1,
);
const rejected = terminal.find((result) => result.status === "rejected");
assert.match(String(rejected.reason), /CHARGE_(RELEASED|COMPLETED)/);
const state = await run("getCharge", { chargeId });
assert.ok(state.state.kind === "released" || state.state.kind === "completed");
const expectedBalance = state.state.kind === "released" ? 5 : 2;
assert.equal(await run("balance", scope), expectedBalance);
const history = await run("history", {
  ...scope,
  paginationOpts: { cursor: null, numItems: 100 },
});
assert.ok(history.isDone);
assert.ok(history.page.every((row) => row.delta !== 0));
assert.equal(
  history.page.reduce((sum, row) => sum + row.delta, 0),
  expectedBalance,
);
console.log(
  `Local Convex passed: 8 duplicate grants, 10 competing reservations, retries, terminal race, and ledger reconciliation (${namespace}).`,
);
