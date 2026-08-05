const BASE = 'http://localhost:7130';
const r = await fetch(BASE + '/api/auth/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'marcus.johnson@mesa.example', password: 'MesaAdmin123!' }),
});
const token = (await r.json()).accessToken;
const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

// Read current default template
const read = await fetch(BASE + '/api/database/records/receipt_templates?select=id,code,name,footer_text&limit=10', { headers: H });
const rows = await read.json();
const tpl = rows.find((x) => x.code === 'TPL-DEFAULT') ?? rows[0];
console.log('BEFORE:', tpl.name, '| footer:', JSON.stringify(tpl.footer_text));

// Patch footer (write path used by saveTemplate -> upsert)
const patch = await fetch(BASE + '/api/database/records/receipt_templates?id=eq.' + tpl.id, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ footer_text: tpl.footer_text + ' [upsert-test]' }),
});
console.log('PATCH status:', patch.status);

// Read back
const read2 = await fetch(BASE + '/api/database/records/receipt_templates?select=id,footer_text&id=eq.' + tpl.id, { headers: H });
const row2 = (await read2.json())[0];
console.log('AFTER:', row2.footer_text);

// Restore original footer
const restore = await fetch(BASE + '/api/database/records/receipt_templates?id=eq.' + tpl.id, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({ footer_text: tpl.footer_text }),
});
console.log('RESTORE status:', restore.status);
