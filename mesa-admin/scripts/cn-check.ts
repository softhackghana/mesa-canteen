/**
 * Self-check for lib/cn.ts (the only non-trivial pure logic in the UI kit).
 * Run: npx tsx scripts/cn-check.ts   (tsx is a devDependency of this repo)
 */
import { cn } from "../lib/cn";

const assert = (name: string, actual: unknown, expected: unknown) => {
  if (actual !== expected) {
    console.error(`FAIL ${name}:\n  got      ${JSON.stringify(actual)}\n  expected ${JSON.stringify(expected)}`);
    process.exitCode = 1;
  } else {
    console.log(`ok   ${name}`);
  }
};

// Last-wins per group.
assert(
  "bg override",
  cn("bg-surface-container-lowest", "bg-surface"),
  "bg-surface",
);
assert(
  "text color override keeps font-size",
  cn("font-body-md text-body-md text-on-surface", "text-error"),
  "font-body-md text-body-md text-error",
);
assert(
  "padding last wins",
  cn("p-4", "p-6"),
  "p-6",
);
assert(
  "border width vs color distinct",
  cn("border border-outline", "border-2"),
  "border-2 border-outline",
);
// Falsy inputs are dropped.
assert("falsy dropped", cn("a", false, null, undefined, "b"), "a b");
// Empty string input.
assert("empty dropped", cn("", "bg-primary"), "bg-primary");

if (process.exitCode) {
  console.error("\ncn self-check FAILED");
} else {
  console.log("\ncn self-check passed");
}
