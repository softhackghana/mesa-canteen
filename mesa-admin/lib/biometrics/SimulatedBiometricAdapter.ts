import type { IBiometricAdapter, BiometricResult } from "./types";
import type { DemoIdentity } from "@/lib/demo-data";
import { identifyByMinutiae, parseMinutiaeTemplate, perturbMinutiaeTemplate, synthesizeMinutiaeTemplate } from "./matcher";

/** In-memory template registry used by the simulator (and usable by real adapters after local template cache load). */
export type TemplateStore = Record<string, DemoIdentity>;

/** Gallery entry used by the 1:N minutiae matcher. */
interface GalleryEntry {
  id: string;
  template: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulated biometric adapter — used when no real DigitalPersona bridge is
 * reachable (FR-IM-007 auto-detect fallback). It now performs genuine 1:N
 * minutiae matching (FR-IM-002) against deterministic synthetic prints so kiosk
 * demos exercise real matcher logic instead of a dictionary lookup.
 *
 * ponytail: synthesizeMinutiaeTemplate is a pure-JS stand-in for a real ISO
 * template decoder. When the SourceAFIS/WASM decoder lands, feed its Minutia[]
 * output directly into identifyByMinutiae and drop synthesis.
 */
export class SimulatedBiometricAdapter implements IBiometricAdapter {
  readonly metadata = { vendor: "MESA", model: "Simulated v1", hardware: false };

  private readonly templates: TemplateStore;
  private readonly gallery: Record<string, GalleryEntry>;
  private ready = false;

  constructor(identities: DemoIdentity[]) {
    this.templates = {};
    for (const i of identities) {
      const synth = synthesizeMinutiaeTemplate(i.template);
      const entry = { ...i, template: synth };
      this.templates[i.id] = entry;
      this.templates[i.template] = entry; // legacy keyboard-shortcut key
    }
    this.gallery = Object.fromEntries(
      Object.values(this.templates).map((i) => [i.id, { id: i.id, template: i.template }]),
    );
  }

  async initialize(): Promise<void> {
    await delay(80);
    this.ready = true;
  }

  /**
   * 1:N identify. The probe may be:
   *   - a minutiae JSON template (real matching), or
   *   - an identity id/legacy template id, in which case we synthesise a perturbed
   *     second capture of that person's stored print and match it.
   *
   * This keeps the kiosk keyboard shortcuts (1–4) working while running the real
   * matcher instead of a dictionary lookup.
   */
  async identify(template: string): Promise<BiometricResult> {
    if (!this.ready) await this.initialize();
    await delay(300);

    const probe = this.buildProbe(template);
    if (!probe) {
      return { match: null, noMatch: true };
    }

    const hit = identifyByMinutiae(probe, this.gallery);
    if (!hit) {
      return { match: null, noMatch: true };
    }
    return {
      match: {
        identityId: hit.identityId,
        score: Math.max(0, 100 - hit.score * 3), // rough quality inversion
      },
    };
  }

  async capture(): Promise<BiometricResult> {
    // Simulated capture without a caller-supplied template: nothing to match.
    await delay(300);
    return { match: null, noMatch: true };
  }

  async close(): Promise<void> {
    this.ready = false;
  }

  private buildProbe(template: string): string | null {
    // Real minutiae JSON probe (e.g. from a test harness or future bridge).
    if (parseMinutiaeTemplate(template)) {
      return template;
    }

    // Legacy id/template id shortcut used by the kiosk demo keys.
    const identity = this.templates[template];
    if (identity) {
      return perturbMinutiaeTemplate(identity.template);
    }

    return null;
  }
}
