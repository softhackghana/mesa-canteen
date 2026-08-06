/**
 * Self-check for lib/people-live.ts (PRD 10.2 / FR-PM-001..004): join
 * mapping, biometric template counting, and credential grouping.
 * Run: npx tsx lib/people-live.selfcheck.ts
 */
// fallow-ignore-file unused-file
import {
  PEOPLE_JOIN_SELECT,
  buildCredentialMap,
  buildTemplateCounts,
  toAdminPerson,
  type PeopleJoinRow,
} from './people-live.ts';

// fallow-ignore-next-line code-duplication
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  } else {
    console.log(`ok   ${name}`);
  }
}

const base: PeopleJoinRow = {
  id: 'p1',
  employee_id: 'EMP-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: null,
  department_id: 'd1',
  cost_centre_id: 'cc1',
  site_id: 's1',
  status: 'active',
  hire_date: '2021-03-15',
  hris_id: null,
  biometric_consent: true,
  consent_at: null,
  photo_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  departments: { code: 'ENG', name: 'Engineering' },
  cost_centres: { code: 'CC-ENG-01', name: 'Engineering Core' },
  sites: { code: 'HQ', name: 'HQ Campus' },
};

// 1. Join names map to fixture conventions: dept/site = name, cost centre = code.
const person = toAdminPerson(base, buildTemplateCounts([]), buildCredentialMap([]));
check('joins map display fields', person.department === 'Engineering' && person.cost_centre === 'CC-ENG-01' && person.site === 'HQ Campus');
check('no templates -> pending', person.biometricStatus === 'pending' && person.biometricTemplates === 0);
check('no credential -> None', person.credential === 'None' && person.credentialValue === undefined);

// 2. Template counting: only count rows actually present; multiple rows per person.
const counts = buildTemplateCounts([
  { person_id: 'p1' },
  { person_id: 'p1' },
  { person_id: 'p2' },
]);
const enrolled = toAdminPerson(base, counts, buildCredentialMap([]));
check('template counts aggregate per person', enrolled.biometricStatus === 'enrolled' && enrolled.biometricTemplates === 2);

// 3. Credential grouping: first active credential wins; type is uppercased.
const creds = buildCredentialMap([
  { person_id: 'p1', credential_type: 'rfid', credential_value: 'CARD-0001' },
  { person_id: 'p1', credential_type: 'pin', credential_value: '1234' },
]);
const withCred = toAdminPerson(base, counts, creds);
check('first credential wins', withCred.credential === 'RFID' && withCred.credentialValue === 'CARD-0001');

// 4. Missing org relations degrade to undefined (person with no dept/site).
const bare = toAdminPerson({ ...base, department_id: null, cost_centre_id: null, site_id: null, departments: null, cost_centres: null, sites: null }, counts, creds);
check('null joins degrade', bare.department === undefined && bare.cost_centre === undefined && bare.site === undefined);

// 5. Select string covers the three FK relations the page renders.
check('join select covers org tables', PEOPLE_JOIN_SELECT.includes('departments') && PEOPLE_JOIN_SELECT.includes('cost_centres') && PEOPLE_JOIN_SELECT.includes('sites'));

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('people-live self-check passed');
