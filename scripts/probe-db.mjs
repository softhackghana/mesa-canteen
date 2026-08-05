const BASE = 'http://localhost:7130';
async function login() {
  const r = await fetch(BASE + '/api/auth/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marcus.johnson@mesa.example', password: 'MesaAdmin123!' }),
  });
  const j = await r.json();
  return j.accessToken;
}
async function q(token, path) {
  const r = await fetch(BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const t = await r.text();
  return { status: r.status, body: t.slice(0, 600) };
}
const token = await login();
console.log('TOKEN_OK', token ? 'yes' : 'no');
for (const tbl of ['terminals', 'license_records', 'license_activations', 'receipt_templates', 'receipt_template_versions', 'audit_logs', 'transactions', 'terminal_heartbeats', 'settings', 'sync_jobs']) {
  const r = await q(token, '/api/database/records/' + tbl + '?limit=2');
  console.log(`\n=== ${tbl} (${r.status}) ===`);
  console.log(r.body);
}