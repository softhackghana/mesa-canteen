const BASE = 'http://localhost:7130';
const r = await fetch(BASE + '/api/auth/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'marcus.johnson@mesa.example', password: 'MesaAdmin123!' }),
});
const token = (await r.json()).accessToken;
const H = { Authorization: 'Bearer ' + token };

for (const [name, url] of [
  ['audit', '/api/database/records/audit_logs?select=id,actor_id,actor_type,entity_type,action,occurred_at,delta&order=occurred_at.desc&limit=10'],
  ['tx-all', '/api/database/records/transactions?select=id,occurred_at,status&order=occurred_at.desc&limit=100'],
  ['tx-counts', '/api/database/rpc/count_transactions_today'],
  ['terminals', '/api/database/records/terminals?select=id,name,last_heartbeat_at,status&limit=20'],
]) {
  const rr = await fetch(BASE + url, { headers: H });
  const txt = await rr.text();
  console.log('===', name, rr.status, txt.slice(0, 700));
}
