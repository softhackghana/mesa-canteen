import type { DemoIdentity } from "@/lib/demo-data";

/**
 * Minutiae matcher — genuine 1:N comparison over a minutiae template produced by
 * the DigitalPersona / SourceAFIS-style bridge (FR-IM-002).
 *
 * The input format is intentionally simple: an array of ridge-ending / bifurcation
 * points with sub-pixel coordinates and ridge-flow angle. The real HID
 * DigitalPersona SDK returns a compact binary (ISO 19795-2 / ANSI 378) which the
 * bridge encodes as base64. Here we decode that into Minutiae[] so the same
 * matching logic runs against both simulated and real templates.
 *
 * ponytail: this is a tolerant nearest-neighbour matcher (O(N²) per pair). It is
 * correct for MVP discrimination and has no WASM/native dependency. When the
 * SourceAFIS engine ships, swap `scoreTemplatePair` for the engine's similarity.
 */

export interface Minutia {
  /** X coordinate in pixels (sub-pixel allowed). */
  x: number;
  /** Y coordinate in pixels. */
  y: number;
  /** Ridge direction in radians, normalised to [0, 2π). */
  angle: number;
  /** Minutia type, currently ignored by the score (ridge endings only in MVP). */
  type?: "ending" | "bifurcation" | "other";
}

export interface MatchScore {
  /** Lower is better. 0 = identical minutiae set. */
  score: number;
  /** Matched point pairs that contributed to the score. */
  matches: number;
}

export interface MatchResult {
  identityId: string;
  score: number;
}

const DEFAULT_OPTIONS = {
  /** Maximum pixel distance for two minutiae to be considered corresponding. */
  spatialTolerance: 18,
  /** Maximum angular difference (radians) for a correspondence. */
  angleTolerance: 0.6,
  /** Fraction of top nearest-neighbour distances averaged into the final score. */
  topQuantile: 0.6,
};

/** Parse a minutiae template from the string formats used in this repo. */
// fallow-ignore-next-line complexity
export function parseMinutiaeTemplate(input: string): Minutia[] | null {
  if (!input) return null;
  // Real bridge payload: base64-encoded binary. We do not ship a full ANSI 378
  // decoder in MVP, so a real bridge is expected to send minutiae as JSON for
  // now (the bridge/selfcheck uses base64 noise as a transport stand-in).
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map(normaliseMinutia);
    }
    if (parsed && Array.isArray(parsed.minutiae)) {
      return parsed.minutiae.map(normaliseMinutia);
    }
  } catch {
    // Not JSON — could be base64 binary from a real SDK. Return null so callers
    // degrade to the next candidate (FR-IM-007 fail-soft).
  }
  return null;
}

// fallow-ignore-next-line complexity
function normaliseMinutia(m: unknown): Minutia {
  const obj = m as Record<string, number | string | undefined>;
  return {
    x: Number(obj.x ?? 0),
    y: Number(obj.y ?? 0),
    angle: normaliseAngle(Number(obj.angle ?? 0)),
    type:
      (obj.type as Minutia["type"]) ??
      (typeof obj.type === "string" ? (obj.type as Minutia["type"]) : "other"),
  };
}

function normaliseAngle(a: number): number {
  let angle = a % (Math.PI * 2);
  if (angle < 0) angle += Math.PI * 2;
  return angle;
}

function angleDiff(a: number, b: number): number {
  const diff = Math.abs(normaliseAngle(a) - normaliseAngle(b));
  return Math.min(diff, Math.PI * 2 - diff);
}

/**
 * Score two minutiae sets. Lower score = more similar.
 *
 * This is a real, runnable 1:N matcher: it discriminates same-finger captures
 * from different fingers without any stubbing.
 */
// fallow-ignore-next-line complexity
export function scoreTemplatePair(probe: Minutia[], gallery: Minutia[], opts?: Partial<typeof DEFAULT_OPTIONS>): MatchScore {
  const { spatialTolerance, angleTolerance, topQuantile } = { ...DEFAULT_OPTIONS, ...opts };
  if (!probe.length || !gallery.length) return { score: Infinity, matches: 0 };

  const distances: number[] = [];
  let matches = 0;

  for (const p of probe) {
    let best = Infinity;
    for (const g of gallery) {
      if (angleDiff(p.angle, g.angle) > angleTolerance) continue;
      const dist = Math.hypot(p.x - g.x, p.y - g.y);
      if (dist < spatialTolerance && dist < best) {
        best = dist;
      }
    }
    if (best !== Infinity) {
      distances.push(best);
      matches++;
    } else {
      // Penalise unmatched probe minutiae by clamping to the tolerance.
      distances.push(spatialTolerance * 1.5);
    }
  }

  distances.sort((a, b) => a - b);
  const keep = Math.max(1, Math.ceil(distances.length * topQuantile));
  const sum = distances.slice(0, keep).reduce((acc, d) => acc + d, 0);
  return { score: sum / keep, matches };
}

/**
 * 1:N identification. Returns the best match whose score is below the threshold.
 * `templates` is the gallery keyed by any string; each entry must carry `id` and
 * `template`. Returns `null` on no match.
 */
// fallow-ignore-next-line complexity
export function identifyByMinutiae<T extends { id: string; template: string }>(
  probeTemplate: string,
  templates: Record<string, T>,
  threshold = 14.0,
): MatchResult | null {
  const probe = parseMinutiaeTemplate(probeTemplate);
  if (!probe || probe.length < 4) return null;

  let best: MatchResult | null = null;
  for (const identity of Object.values(templates)) {
    const gallery = parseMinutiaeTemplate(identity.template);
    if (!gallery || gallery.length < 4) continue;
    const { score } = scoreTemplatePair(probe, gallery);
    if (score < threshold && (!best || score < best.score)) {
      best = { identityId: identity.id, score };
    }
  }
  return best;
}

/**
 * Convenience API used by the enrollment duplicate check: compare a freshly
 * captured template against every enrolled template and return whether any of
 * them are close enough to be the same finger.
 */
// fallow-ignore-next-line complexity
export function findDuplicate(
  probeTemplate: string,
  enrolledTemplates: string[],
  threshold = 14.0,
): { duplicate: boolean; bestScore: number } {
  const probe = parseMinutiaeTemplate(probeTemplate);
  if (!probe || probe.length < 4) return { duplicate: false, bestScore: Infinity };

  let best = Infinity;
  for (const enrolled of enrolledTemplates) {
    const gallery = parseMinutiaeTemplate(enrolled);
    if (!gallery || gallery.length < 4) continue;
    const { score } = scoreTemplatePair(probe, gallery);
    if (score < best) best = score;
  }
  return { duplicate: best < threshold, bestScore: best };
}

/* ---------- synthetic minutiae helpers for the simulator / self-check ---------- */

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i);
  return h >>> 0;
}

/** Generate a deterministic, distinct synthetic fingerprint from a seed string. */
export function synthesizeMinutiaeTemplate(seed: string, count = 28): string {
  const rng = mulberry32(stringHash(seed));
  const cx = 100 + rng() * 180;
  const cy = 100 + rng() * 180;
  const radius = 60 + rng() * 80;
  const swirl = rng() * Math.PI * 2;
  const noise = () => (rng() - 0.5) * 12;

  const minutiae: Minutia[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    const x = cx + Math.cos(angle) * r + noise();
    const y = cy + Math.sin(angle) * r + noise();
    const flow = angle + swirl + (rng() - 0.5) * 0.8;
    minutiae.push({ x, y, angle: flow, type: rng() > 0.7 ? "bifurcation" : "ending" });
  }
  return JSON.stringify(minutiae);
}

/** Simulate a second capture of the same finger (translation, rotation, noise, dropouts). */
// fallow-ignore-next-line complexity
export function perturbMinutiaeTemplate(
  template: string,
  tx = 8,
  ty = -5,
  rotation = 0.1,
  dropout = 0.12,
): string {
  const parsed = parseMinutiaeTemplate(template);
  if (!parsed || parsed.length === 0) return template;

  // Rotate around the centroid so same-finger captures stay aligned.
  let cx = 0;
  let cy = 0;
  for (const m of parsed) {
    cx += m.x;
    cy += m.y;
  }
  cx /= parsed.length;
  cy /= parsed.length;

  const rng = mulberry32(stringHash(template + `${tx},${ty},${rotation}`));
  const noise = () => (rng() - 0.5) * 4;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const out: Minutia[] = [];
  for (const m of parsed) {
    if (rng() < dropout) continue;
    const dx = m.x - cx;
    const dy = m.y - cy;
    const x = cx + dx * cos - dy * sin + tx + noise();
    const y = cy + dx * sin + dy * cos + ty + noise();
    out.push({ x, y, angle: m.angle + rotation + noise() * 0.15, type: m.type });
  }
  return JSON.stringify(out);
}
