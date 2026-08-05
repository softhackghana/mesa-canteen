import {
  findDuplicate,
  identifyByMinutiae,
  parseMinutiaeTemplate,
  perturbMinutiaeTemplate,
  scoreTemplatePair,
  synthesizeMinutiaeTemplate,
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
// fallow-ignore-file unused-file

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("matcher.selfcheck: FAIL —", msg);
    process.exit(1);
  }
}

function main(): void {
  const fingerA = synthesizeMinutiaeTemplate("alice-right-index", 32);
  const fingerB = synthesizeMinutiaeTemplate("bob-right-index", 28);
  const fingerC = synthesizeMinutiaeTemplate("carol-right-index", 26);

  // 1. Same-finger captures must score low (match).
  const sameA2 = perturbMinutiaeTemplate(fingerA, 6, -4, 0.1, 0.12);
  const scoreAA = scoreTemplatePair(
    parseMinutiaeTemplate(sameA2)!,
    parseMinutiaeTemplate(fingerA)!,
  );
  assert(scoreAA.score < 14.0, `same-finger score too high: ${scoreAA.score.toFixed(2)}`);
  assert(scoreAA.matches >= 14, `same-finger matches too few: ${scoreAA.matches}`);

  // 2. Different fingers must score high (no match).
  const scoreAB = scoreTemplatePair(
    parseMinutiaeTemplate(fingerA)!,
    parseMinutiaeTemplate(fingerB)!,
  );
  const scoreAC = scoreTemplatePair(
    parseMinutiaeTemplate(fingerA)!,
    parseMinutiaeTemplate(fingerC)!,
  );
  assert(scoreAB.score >= 14.0, `different-finger A vs B too low: ${scoreAB.score.toFixed(2)}`);
  assert(scoreAC.score >= 14.0, `different-finger A vs C too low: ${scoreAC.score.toFixed(2)}`);

  // 3. Empty / tiny templates degrade safely.
  assert(parseMinutiaeTemplate("") === null, "empty template should parse to null");
  const emptyScore = scoreTemplatePair([], parseMinutiaeTemplate(fingerA)!);
  assert(!Number.isFinite(emptyScore.score) && emptyScore.matches === 0, "empty probe should return Infinity");
  const tinyScore = scoreTemplatePair([{ x: 0, y: 0, angle: 0 }], parseMinutiaeTemplate(fingerA)!);
  assert(tinyScore.score >= 14.0, "tiny probe should not match a full finger");

  // 4. 1:N identification returns the right identity.
  const galleryEntries: Record<string, { id: string; template: string }> = {
    alice: { id: "EMP-ALICE", template: fingerA },
    bob: { id: "EMP-BOB", template: fingerB },
    carol: { id: "EMP-CAROL", template: fingerC },
  };
  const hit = identifyByMinutiae(sameA2, galleryEntries);
  assert(hit !== null && hit.identityId === "EMP-ALICE", `1:N should identify Alice, got ${JSON.stringify(hit)}`);

  // 5. Duplicate detection flags same finger, clears different finger.
  const dupSame = findDuplicate(sameA2, [fingerA]);
  assert(dupSame.duplicate, "duplicate check should flag same finger");
  const dupDiff = findDuplicate(fingerA, [fingerB]);
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
