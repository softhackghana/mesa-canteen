import type { IBiometricAdapter, BiometricResult } from "./types";
import type { DemoIdentity } from "@/lib/demo-data";

/** In-memory template registry used by the simulator (and usable by real adapters after local template cache load). */
export type TemplateStore = Record<string, DemoIdentity>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulated biometric adapter — used when no real DigitalPersona bridge is
 * reachable (FR-IM-007 auto-detect fallback). Emulates a ~300ms capture with a
 * deterministic quality score against demo identities seeded from lib/demo-data.
 */
export class SimulatedBiometricAdapter implements IBiometricAdapter {
  readonly metadata = { vendor: "MESA", model: "Simulated v1", hardware: false };

  private readonly templates: TemplateStore;
  private ready = false;

  constructor(identities: DemoIdentity[]) {
    this.templates = Object.fromEntries(identities.map((i) => [i.template, i]));
  }

  async initialize(): Promise<void> {
    await delay(80);
    this.ready = true;
  }

  /**
   * Identifies by template id (caller passes the synthetic template captured
   * from a demo identity, e.g. via the kiosk "scan" trigger). Mirrors the real
   * 1:N loop in DigitalPersonaAdapter.
   */
  async identify(template: string): Promise<BiometricResult> {
    if (!this.ready) await this.initialize();
    await delay(300);
    const identity = this.templates[template];
    if (!identity) {
      return { match: null, noMatch: true };
    }
    return {
      match: {
        identityId: identity.id,
        // Deterministic quality score; real adapter returns SourceAFIS similarity.
        score: 92 + (identity.id.length % 7),
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
}
