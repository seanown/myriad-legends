// Cloud save by transfer code for MYRIAD LEGENDS. D1 binding: DB.
// POST {action:'create', data} -> {code, updated}
// POST {action:'put', code, data} -> {updated}
// POST {action:'get', code} -> {data, updated}
// POST {action:'google', credential, code?, data?} -> {code, data, updated}  (needs env GOOGLE_CLIENT_ID)
// GET -> {google: client id or null}
const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const MAX = 900000;
// Public Google OAuth client ID (not a secret). Env GOOGLE_CLIENT_ID overrides it.
const GOOGLE_ID = '144165557546-ulqf37rg47kip9e42n1k099aqdid7nff.apps.googleusercontent.com';
const gid = env => env.GOOGLE_CLIENT_ID || GOOGLE_ID;

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
  await db.prepare('CREATE TABLE IF NOT EXISTS gusers (sub TEXT PRIMARY KEY, code TEXT NOT NULL, created INTEGER NOT NULL)').run();
}
// Verify a Google ID token with Google's tokeninfo endpoint. Only the stable account id (sub) is kept, never the email.
async function googleSub(env, cred) {
  if (!cred) return null;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
  if (!r.ok) return null;
  const t = await r.json();
  if (t.aud !== gid(env)) return null;
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') return null;
  if (Number(t.exp) * 1000 < Date.now()) return null;
  return t.sub ? 'g:' + t.sub : null;
}
const goodData = d => { try { const o = JSON.parse(d); return !!o && typeof o.owned === 'object'; } catch (e) { return false; } };

export async function onRequestGet({ env }) {
  return json({ google: gid(env) });
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
    if (body.action === 'google') {
      const sub = await googleSub(env, body.credential);
      if (!sub) return json({ error: 'google sign-in failed' }, 401);
      const link = await db.prepare('SELECT code FROM gusers WHERE sub = ?').bind(sub).first();
      let code = link && link.code;
      if (!code) {
        // First Google sign-in: attach this device's existing code, or make a new save from this device's data.
        const mine = norm(body.code);
        if (mine && await db.prepare('SELECT 1 FROM saves WHERE code = ?').bind(mine).first()) code = mine;
        else {
          const data = typeof body.data === 'string' ? body.data : JSON.stringify(body.data || null);
          if (!data || data.length > MAX || !goodData(data)) return json({ error: 'bad save' }, 400);
          for (let i = 0; i < 5 && !code; i++) {
            const c = newCode();
            const r = await db.prepare('INSERT OR IGNORE INTO saves (code, data, created, updated) VALUES (?, ?, ?, ?)').bind(c, data, now, now).run();
            if (r.meta && r.meta.changes) code = c;
          }
          if (!code) return json({ error: 'try again' }, 500);
        }
        await db.prepare('INSERT OR IGNORE INTO gusers (sub, code, created) VALUES (?, ?, ?)').bind(sub, code, now).run();
        const again = await db.prepare('SELECT code FROM gusers WHERE sub = ?').bind(sub).first();
        code = again.code;
      }
      const row = await db.prepare('SELECT data, updated FROM saves WHERE code = ?').bind(code).first();
      if (!row) return json({ error: 'not found' }, 404);
      return json({ code, data: row.data, updated: row.updated });
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
