const BASE = 'http://localhost:7130';
const r = await fetch(BASE + '/api/auth/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'marcus.johnson@mesa.example', password: 'MesaAdmin123!' }),
});
const token = (await r.json()).accessToken;
const H = { Authorization: 'Bearer ' + token };

const url = '/api/database/records/transactions?select=id,transaction_ref,occurred_at,status,meal_period,gross_amount,person:person_id(first_name,last_name,employee_id,department:department_id(name),cost_centre:cost_centre_id(name)),site:site_id(name),terminal:terminal_id(name)&limit=3';
const rr = await fetch(BASE + url, { headers: H });
console.log('status', rr.status);
console.log((await rr.text()).slice(0, 800));
