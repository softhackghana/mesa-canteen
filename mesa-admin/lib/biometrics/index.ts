import type { IBiometricAdapter, AdapterMetadata } from "./types";
import { DigitalPersonaAdapter } from "./DigitalPersonaAdapter";
import { SimulatedBiometricAdapter } from "./SimulatedBiometricAdapter";
import { demoIdentities } from "@/lib/demo-data";

export type { IBiometricAdapter } from "./types";

/**
 * Auto-detect the best available adapter (FR-IM-007): try the real
 * DigitalPersona bridge first; if it is unreachable, fall back to the
 * simulator so the POS never dies on missing hardware. Every call returns a
 * ready-to-use adapter and resolves with a note about which one was chosen.
 */
export async function autoDetectAdapter(): Promise<{ adapter: IBiometricAdapter; note: string }> {
  const digitalPersona = new DigitalPersonaAdapter();
  const err = await digitalPersona.initialize();
  if (!err) {
    return {
      adapter: digitalPersona,
      note: `DigitalPersona (${digitalPersona.metadata.model}) — hardware bridge connected.`,
    };
  }
  const simulated = new SimulatedBiometricAdapter(demoIdentities);
  await simulated.initialize();
  return {
    adapter: simulated,
    note: `Fallback: ${err} Using ${simulated.metadata.vendor} ${simulated.metadata.model}.`,
  };
}

/** Metadata of every adapter the platform knows about (for device management UI). */
export function knownAdapters(): AdapterMetadata[] {
  return [
    new DigitalPersonaAdapter().metadata,
    new SimulatedBiometricAdapter([]).metadata,
    { vendor: "Suprema", model: "BioMini Slim 2", hardware: false },
    { vendor: "ZKTeco", model: "SLK20R", hardware: false },
  ];
}
