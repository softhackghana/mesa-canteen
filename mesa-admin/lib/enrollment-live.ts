import { synthesizeMinutiaeTemplate } from './biometrics/matcher';
import type { AdminPerson } from './admin-data';

/**
 * Live enrollment payload building (PRD 10.1 / FR-IM-001..006, FR-PM-003).
 *
 * The biometric adapter layer never surfaces raw ISO templates to the page
 * (capture() returns only a match verdict), so a captured impression is
 * persisted as a synthesized SourceAFIS-format minutiae JSON seeded from the
 * person + finger — the same string the POS simulator stores and matches at
 * scan time. That keeps enrollment and scan interoperable without a reader.
 *
 * ponytail: seed = employee_id + finger is NOT real fingerprint data; when the
 * advisory bridge returns a template payload, pass it through and stop
 * synthesising. DB column is bytea, so the template is hex-encoded (matches
 * db/seed.sql decoding of bytea as hex). AES-256 encryption at rest stays
 * deferred alongside the template cache (see docs/TESTING_GUIDE.md).
 */

/** finger_position codes stored by the page's FINGERS list. */
export type EnrollFingerId =
  | 'right_index' | 'right_thumb' | 'right_middle'
  | 'left_index' | 'left_thumb' | 'left_middle';

export interface EnrollImpression {
  finger: EnrollFingerId;
  quality: number;
  accepted: boolean;
}

/** UTF-8 → lowercase hex, matching Postgres `decode(hex)` for bytea columns. */
export function toHex(utf8: string): string {
  return Array.from(new TextEncoder().encode(utf8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Minutiae JSON template hex for a person + finger (mirrors seed convention). */
export function templateHexFor(employeeId: string, finger: string): string {
  return toHex(synthesizeMinutiaeTemplate(`${employeeId}:${finger}`));
}

export interface EnrollmentTemplatesRow {
  finger_position: string;
  template: string;
  vendor: string;
  quality_score: number;
}

export interface EnrollmentVerdict {
  /** template bytea hex rows, one per accepted finger. */
  templates: EnrollmentTemplatesRow[];
  /** people.patch: status/consent reflect the successful enrollment. */
  personPatch: { status: string; biometric_consent: boolean };
  /** audit input after a successful save. */
  audit: { action: string; entityId: string; delta: Record<string, unknown> };
}

/**
 * Build the persistence payload for a completed enrollment. Pure — runnable in
 * the self-check without a backend.
 */
export function buildEnrollment(
  person: Pick<AdminPerson, 'id' | 'employee_id' | 'first_name' | 'last_name'>,
  impressions: EnrollImpression[],
  vendor: string,
): EnrollmentVerdict {
  const accepted = impressions.filter((i) => i.accepted);
  return {
    templates: accepted.map((i) => ({
      finger_position: i.finger,
      template: templateHexFor(person.employee_id, i.finger),
      vendor,
      quality_score: i.quality,
    })),
    personPatch: { status: 'active', biometric_consent: true },
    audit: {
      action: 'enroll',
      entityId: person.id,
      delta: {
        employee_id: person.employee_id,
        templates: accepted.length,
        fingers: accepted.map((i) => i.finger),
        quality_min: accepted.length ? Math.min(...accepted.map((i) => i.quality)) : null,
        quality_max: accepted.length ? Math.max(...accepted.map((i) => i.quality)) : null,
      },
    },
  };
}