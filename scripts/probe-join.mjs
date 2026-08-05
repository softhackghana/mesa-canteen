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
  ['transaction-person-join', '/api/database/records/transactions?select=id,person:person_id(first_name,last_name),status,occurred_at&limit=3'],
];
for (const [name, url] of tests) {
  const rr = await fetch(BASE + url, { headers: H });
  console.log('--- ' + name + ' ' + rr.status);
  console.log((await rr.text()).slice(0, 350));
}