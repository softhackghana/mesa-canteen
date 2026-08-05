import {
  findDuplicate,
  identifyByMinutiae,
  parseMinutiaeTemplate,
  scoreTemplatePair,
  type Minutia,
} from "./matcher";

/**
 * Self-check for the genuine minutiae matcher (FR-IM-002).
 *
 * Verifies:
 *   1. Same-finger captures with realistic translation, rotation, noise and
 *      missing points still match (score below threshold).
 *   2. Different-finger templates do NOT match (score above threshold).
 *   3. Empty or malformed templates degrade safely (no crash, no match).
 *   4. The 1:N API returns the correct identity from a gallery.
 */

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("matcher.selfcheck: FAIL —", msg);
    process.exit(1);
  }
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/** Generate a deterministic fingerprint-like minutiae set with ridge structure. */
function generateFinger(seed: string, count = 32): Minutia[] {
  // Simple string hash to seed a deterministic PRNG.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rng = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };

  // Derive a per-finger print patch: different center, scale and ridge swirl.
  const cx = 100 + rng() * 180;
  const cy = 100 + rng() * 180;
  const radius = 60 + rng() * 80;
  const swirl = rng() * Math.PI * 2;

  const minutiae: Minutia[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius; // uniform inside circle
    const x = cx + Math.cos(angle) * r + rand(-6, 6);
    const y = cy + Math.sin(angle) * r + rand(-6, 6);
    // Ridge flow follows a locally consistent direction around the print core.
    const flow = angle + swirl + rand(-0.4, 0.4);
    minutiae.push({ x, y, angle: flow, type: rng() > 0.7 ? "bifurcation" : "ending" });
  }
  return minutiae;
}

/** Simulate a second capture of the same finger: translation, rotation, noise, dropouts. */
function perturbSameFinger(minutiae: Minutia[], tx = 8, ty = -5, rotation = 0.12): Minutia[] {
  const cx = 150;
  const cy = 150;
  return minutiae
    .filter(() => Math.random() > 0.12) // 12% missing points
    .map((m) => {
      const [x, y] = rotatePoint(m.x, m.y, cx, cy, rotation);
      return {
        x: x + tx + rand(-2, 2),
        y: y + ty + rand(-2, 2),
        angle: m.angle + rotation + rand(-0.15, 0.15),
        type: m.type,
      };
    });
}

function main(): void {
  const fingerA = generateFinger("alice-right-index", 28);
  const fingerB = generateFinger("bob-right-index", 28);
  const fingerC = generateFinger("carol-right-index", 26);

  // 1. Same-finger captures must score low (match).
  const sameA2 = perturbSameFinger(fingerA, 6, -4, 0.1);
  const scoreAA = scoreTemplatePair(sameA2, fingerA);
  assert(scoreAA.score < 14.0, `same-finger score too high: ${scoreAA.score.toFixed(2)}`);
  assert(scoreAA.matches >= 14, `same-finger matches too few: ${scoreAA.matches}`);

  // 2. Different fingers must score high (no match).
  const scoreAB = scoreTemplatePair(fingerA, fingerB);
  const scoreAC = scoreTemplatePair(fingerA, fingerC);
  assert(scoreAB.score >= 14.0, `different-finger A vs B too low: ${scoreAB.score.toFixed(2)}`);
  assert(scoreAC.score >= 14.0, `different-finger A vs C too low: ${scoreAC.score.toFixed(2)}`);

  // 3. Empty / tiny templates degrade safely.
  assert(parseMinutiaeTemplate("") === null, "empty template should parse to null");
  const emptyScore = scoreTemplatePair([], fingerA);
  assert(!Number.isFinite(emptyScore.score) && emptyScore.matches === 0, "empty probe should return Infinity");
  const tinyScore = scoreTemplatePair([{ x: 0, y: 0, angle: 0 }], fingerA);
  assert(tinyScore.score >= 16.0, "tiny probe should not match a full finger");

  // 4. 1:N identification returns the right identity.
  const gallery = {
    alice: fingerA,
    bob: fingerB,
    carol: fingerC,
  };
  const galleryEntries: Record<string, { id: string; template: string }> = {
    alice: { id: "EMP-ALICE", template: JSON.stringify(gallery.alice) },
    bob: { id: "EMP-BOB", template: JSON.stringify(gallery.bob) },
    carol: { id: "EMP-CAROL", template: JSON.stringify(gallery.carol) },
  };
  const hit = identifyByMinutiae(JSON.stringify(sameA2), galleryEntries);
  assert(hit !== null && hit.identityId === "EMP-ALICE", `1:N should identify Alice, got ${JSON.stringify(hit)}`);

  // 5. Duplicate detection flags same finger, clears different finger.
  const dupSame = findDuplicate(JSON.stringify(sameA2), [JSON.stringify(fingerA)]);
  assert(dupSame.duplicate, "duplicate check should flag same finger");
  const dupDiff = findDuplicate(JSON.stringify(fingerA), [JSON.stringify(fingerB)]);
  assert(!dupDiff.duplicate, "duplicate check should not flag different fingers");

  console.log(
    "matcher.selfcheck: OK — same-finger",
    scoreAA.score.toFixed(2),
    " | different-finger A/B ",
    scoreAB.score.toFixed(2),
    " | A/C ",
    scoreAC.score.toFixed(2),
    " | 1:N hit ",
    hit?.identityId,
  );
}

main();
