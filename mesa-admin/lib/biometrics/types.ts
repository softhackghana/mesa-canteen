/**
 * Biometric adapter layer — MESA POS.
 *
 * One common interface implemented by every vendor adapter (DigitalPersona,
 * Suprema, ZKTeco) plus a simulator. See PRD §12 "Device Abstraction":
 * adapters handle only USB communication and raw image extraction; matching is
 * done above this layer. Adapters must never throw into the UI — failures are
 * surfaced as `BiometricResult.error` so the POS can fail soft.
 */

export interface AdapterMetadata {
  vendor: string;
  model: string;
  /** true when the adapter is a hardware-backed real device. */
  hardware: boolean;
}

export interface BiometricMatch {
  /** Internal identity id (demo data id / server profile id). */
  identityId: string;
  /** 0–100 match confidence from the template matcher. */
  score: number;
}

export interface BiometricResult {
  /** identityId set when the capture matched an enrolled template. */
  match: BiometricMatch | null;
  /** Present when the capture completed but no template matched. */
  noMatch?: boolean;
  /** Human-readable error, e.g. bridge unreachable; never throw. */
  error?: string;
}

export interface IBiometricAdapter {
  readonly metadata: AdapterMetadata;

  /**
   * Open the device and enrol in the always-listening poll loop (FR-POS-001).
   * Resolves when ready; resolves with an error message if the device is
   * unavailable (fail soft, never throw).
   */
  initialize(): Promise<void | string>;

  /**
   * Blocking capture + 1:N identify against the enrolled template cache.
   * Must settle within ~1s for a successful scan (FR-POS-004).
   */
  capture(): Promise<BiometricResult>;

  /** Tear down the device / bridge / timers. */
  close(): Promise<void>;
}
