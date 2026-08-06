import type { AdminPerson } from './admin-data';
import type { Person } from './types';

/**
 * People Master → live `people` rows (PRD 10.2 / FR-PM-001..004).
 *
 * Pure mapping helpers shared by the people store: the page needs display
 * names for department / cost centre / site (joined via *_id FK columns) and
 * derived biometric + credential state from the child tables. Kept out of the
 * store so the mapping logic stays runnable in a self-check.
 */

/** Embedded-resource select: adds the org names the UI shows. */
export const PEOPLE_JOIN_SELECT =
  '*, departments(code, name), cost_centres(code, name), sites(code, name)';

/** A people row as returned with the embedded org relations. */
export type PeopleJoinRow = Person & {
  departments?: { code: string; name: string } | null;
  cost_centres?: { code: string; name: string } | null;
  sites?: { code: string; name: string } | null;
};

/** Active biometric template count per person id. */
export function buildTemplateCounts(rows: Array<{ person_id: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.person_id, (counts.get(r.person_id) ?? 0) + 1);
  return counts;
}

/** First active credential per person id (RFID/PIN/QR; a person may have several). */
export function buildCredentialMap(
  rows: Array<{ person_id: string; credential_type: string; credential_value: string }>,
): Map<string, { credential: NonNullable<AdminPerson['credential']>; credentialValue: string }> {
  const map = new Map<string, { credential: NonNullable<AdminPerson['credential']>; credentialValue: string }>();
  for (const r of rows) {
    if (map.has(r.person_id)) continue;
    map.set(r.person_id, {
      credential: r.credential_type.toUpperCase() as NonNullable<AdminPerson['credential']>,
      credentialValue: r.credential_value,
    });
  }
  return map;
}

/** Map a joined people row to the UI shape (display joins + derived state). */
// fallow-ignore-next-line complexity
export function toAdminPerson(
  row: PeopleJoinRow,
  templateCounts: Map<string, number>,
  credsByPerson: Map<string, { credential: NonNullable<AdminPerson['credential']>; credentialValue: string }>,
): AdminPerson {
  const templates = templateCounts.get(row.id) ?? 0;
  const cred = credsByPerson.get(row.id);
  return {
    id: row.id,
    employee_id: row.employee_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    department_id: row.department_id,
    cost_centre_id: row.cost_centre_id,
    site_id: row.site_id,
    status: row.status,
    hire_date: row.hire_date,
    hris_id: row.hris_id,
    biometric_consent: row.biometric_consent,
    consent_at: row.consent_at,
    photo_url: row.photo_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Enrolled when >= 1 active biometric template exists (matches fixtures).
    biometricStatus: templates > 0 ? 'enrolled' : 'pending',
    biometricTemplates: templates,
    credential: cred?.credential ?? 'None',
    credentialValue: cred?.credentialValue,
    // Fixture convention: department/site display names, cost centre shows its code.
    department: row.departments?.name,
    cost_centre: row.cost_centres?.code,
    site: row.sites?.name,
  };
}
