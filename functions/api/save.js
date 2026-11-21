// Cloud save by transfer code for MYRIAD LEGENDS. D1 binding: DB.
// POST {action:'create', data} -> {code, updated}
// POST {action:'put', code, data} -> {updated}
// POST {action:'get', code} -> {data, updated}
const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const MAX = 900000;

function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(10));
  let s = '';
  for (let i = 0; i < 10; i++) s += ABC[b[i] % ABC.length];
  return 'ML-' + s.slice(0, 5) + '-' + s.slice(5);
}
const norm = c => {
  const s = String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^ML/, '');
  return s.length === 10 ? 'ML-' + s.slice(0, 5) + '-' + s.slice(5) : null;
};
async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS saves (code TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL)').run();
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: 'no database bound' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const db = env.DB;
  const run = async () => {
    const now = Date.now();
    if (body.action === 'create' || body.action === 'put') {
      const data = typeof body.data === 'string' ? body.data : JSON.stringify(body.data || null);
      if (!data || data.length > MAX) return json({ error: 'save too large' }, 413);
      try { const o = JSON.parse(data); if (!o || typeof o.owned !== 'object') throw 0; } catch (e) { return json({ error: 'bad save' }, 400); }
      if (body.action === 'create') {
        for (let i = 0; i < 5; i++) {
          const code = newCode();
          const r = await db.prepare('INSERT OR IGNORE INTO saves (code, data, created, updated) VALUES (?, ?, ?, ?)').bind(code, data, now, now).run();
          if (r.meta && r.meta.changes) return json({ code, updated: now });
        }
        return json({ error: 'try again' }, 500);
      }
      const code = norm(body.code);
      if (!code) return json({ error: 'bad code' }, 400);
      const r = await db.prepare('UPDATE saves SET data = ?, updated = ? WHERE code = ?').bind(data, now, code).run();
      if (!r.meta || !r.meta.changes) return json({ error: 'not found' }, 404);
      return json({ updated: now });
    }
    if (body.action === 'get') {
      const code = norm(body.code);
      if (!code) return json({ error: 'bad code' }, 400);
      const row = await db.prepare('SELECT data, updated FROM saves WHERE code = ?').bind(code).first();
      if (!row) return json({ error: 'not found' }, 404);
      return json({ code, data: row.data, updated: row.updated });
    }
    return json({ error: 'bad action' }, 400);
  };
  try { return await run(); }
  catch (e) { await ensure(db); return await run(); }
}
