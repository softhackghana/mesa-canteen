// fallow-ignore-file unused-file
// Throwaway diagnostics: verify MESA InsForge backend data for the admin pages.
// Not part of the app; kept so future devs can re-check live rows quickly.
const BASE = 'http://localhost:7130';
const r = await fetch(BASE + '/api/auth/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'marcus.johnson@mesa.example', password: 'MesaAdmin123!' }),
});
const token = (await r.json()).accessToken;
const H = { Authorization: 'Bearer ' + token };

const tests = [
  ['sites', '/api/database/records/sites?select=id,code,name&limit=20'],
  ['departments', '/api/database/records/departments?select=id,code,name&limit=20'],
  ['cost_centres', '/api/database/records/cost_centres?select=id,code,name&limit=20'],
  ['terminals', '/api/database/records/terminals?select=id,name,status,last_heartbeat_at&limit=20'],
  ['audit', '/api/database/records/audit_logs?select=id,actor_id,actor_type,entity_type,action,occurred_at,delta&order=occurred_at.desc&limit=10'],
  ['tx-join', '/api/database/records/transactions?select=id,transaction_ref,occurred_at,status,meal_period,gross_amount,person:person_id(first_name,last_name,employee_id,department:department_id(name),cost_centre:cost_centre_id(name)),site:site_id(name),terminal:terminal_id(name)&limit=3'],
];
for (const [name, url] of tests) {
  const rr = await fetch(BASE + url, { headers: H });
  const txt = await rr.text();
  console.log('===', name, rr.status, txt.slice(0, 300));
}
