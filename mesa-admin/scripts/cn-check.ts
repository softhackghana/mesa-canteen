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
// Distinct axes must NOT evict each other. Collapsing px/py and w/h into one
// group each silently deleted 40 classes across the UI kit before this.
assert("px and py coexist", cn("px-6 py-3"), "px-6 py-3");
assert("h and w coexist", cn("h-10 w-full"), "h-10 w-full");
assert("pl and pr coexist", cn("pl-10 pr-4"), "pl-10 pr-4");
assert("min-h vs h distinct", cn("min-h-11 h-14"), "min-h-11 h-14");
assert(
  "side border width vs border colour",
  cn("border-b", "border-outline-variant"),
  "border-b border-outline-variant",
);
assert(
  "arbitrary side border keeps colour",
  cn("border-l-[3px] border-primary"),
  "border-l-[3px] border-primary",
);
assert(
  "text-align vs text colour",
  cn("text-left", "text-on-surface-variant"),
  "text-left text-on-surface-variant",
);
assert(
  "kiosk display size vs text colour",
  cn("text-display-lg", "text-primary"),
  "text-display-lg text-primary",
);
assert(
  "kiosk body size vs font family",
  cn("font-kiosk-body", "text-kiosk-body"),
  "font-kiosk-body text-kiosk-body",
);

// Same axis still resolves last-wins.
assert("px last wins", cn("px-4", "px-6"), "px-6");
assert("h last wins", cn("h-8", "h-10"), "h-10");
assert("text-align last wins", cn("text-left", "text-right"), "text-right");
assert("side border width last wins", cn("border-b-2", "border-b-4"), "border-b-4");

// Falsy inputs are dropped.
assert("falsy dropped", cn("a", false, null, undefined, "b"), "a b");
// Empty string input.
assert("empty dropped", cn("", "bg-primary"), "bg-primary");

if (process.exitCode) {
  console.error("\ncn self-check FAILED");
} else {
  console.log("\ncn self-check passed");
}
