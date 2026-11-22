// LUX (Legendary UX): one-of-a-kind cards, exactly ONE copy worldwide, plus world mint serials for SR+ copies.
// D1 binding: DB. The server, not the browser, rolls the LUX chance and claims the card in one atomic UPDATE,
// so two players can never get the same LUX.
//
// POST {pid, n, mint:[card ids]}     called once per opened pack
//   -> {lux:{id,at}|null, mints:{id:serial}}
// POST {action:'name', pid, id, name} owner sets the name shown in the public LUX hall of fame
// GET  ?pid=a,b                       -> {rate, cards:[{id, at|null, name|null, mine}]}   (public hall of fame)
// GET  ?mint=123                      -> {id, n}   (copies of that card pulled worldwide so far)
const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

// Season 1 LUX cards (ids 99001+, never renumber). Must match lux.json.
export const LUX_IDS = [99001, 99002, 99003, 99004, 99005, 99006, 99007, 99008, 99009, 99010, 99011, 99012];
// Chance per card that the pull is a LUX (only while unclaimed LUX cards remain). Env LUX_RATE overrides.
const LUX_P = 1 / 200000;
// Anti-abuse: cards counted per IP and per player in a 10-minute window (honest play tops out near 180).
const WIN_MS = 10 * 60 * 1000, WIN_MAX = 240;
// At most one LUX claim per IP per 24 hours.
const IP_DAY = 24 * 3600 * 1000;

const goodPid = p => typeof p === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(p);
async function ipHash(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '0';
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((env.LUX_SALT || 'myriad-lux-v1') + ip));
  return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');
}
function rand() { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; }

async function ensure(db) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS lux (id INTEGER PRIMARY KEY, owner TEXT, iph TEXT, at INTEGER, name TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS mint (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS luxq (k TEXT PRIMARY KEY, w INTEGER NOT NULL, n INTEGER NOT NULL)'),
  ]);
}
const addName = db => db.prepare('ALTER TABLE lux ADD COLUMN name TEXT').run().catch(() => {});
// default public name: a stable anonymous tag derived from the player id (the id itself stays secret)
function defName(owner) { let h = 0; for (const ch of owner) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return '#' + h.toString(36).toUpperCase().padStart(6, '0').slice(-6); }
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const seed = db => db.batch(LUX_IDS.map(id => db.prepare('INSERT OR IGNORE INTO lux (id) VALUES (?)').bind(id)));
// run fn; if the tables don't exist yet, create them and retry once
async function withTables(db, fn) {
  try { return await fn(); } catch (e) { await ensure(db); await seed(db); return await fn(); }
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return json({ error: 'no database bound' }, 503);
  const db = env.DB, q = new URL(request.url).searchParams;
  return withTables(db, async () => {
    if (q.has('mint')) {
      const id = Math.floor(Number(q.get('mint')));
      const r = await db.prepare('SELECT n FROM mint WHERE id = ?').bind(id).first();
      return json({ id, n: r ? r.n : 0 });
    }
    const pids = (q.get('pid') || '').split(',').filter(goodPid).slice(0, 8);
    let rows;
    try { rows = (await db.prepare('SELECT id, owner, at, name FROM lux').all()).results || []; }
    catch (e) { await addName(db); rows = (await db.prepare('SELECT id, owner, at, name FROM lux').all()).results || []; }
    const by = {}; for (const r of rows) by[r.id] = r;
    const cards = LUX_IDS.map(id => {
      const r = by[id];
      return { id, at: r && r.owner ? r.at : null, name: r && r.owner ? (r.name || defName(r.owner)) : null, mine: !!(r && r.owner && pids.includes(r.owner)) };
    });
    return json({ rate: Number(env.LUX_RATE) || LUX_P, live: env.LUX_LIVE === '1', cards });
  });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: 'no database bound' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const pid = body.pid, n = Math.floor(Number(body.n));
  if (body.action === 'name') {
    const id = Math.floor(Number(body.id)), name = cleanName(body.name);
    if (!goodPid(pid) || !LUX_IDS.includes(id)) return json({ error: 'bad request' }, 400);
    const run = () => env.DB.prepare('UPDATE lux SET name = ? WHERE id = ? AND owner = ?').bind(name || null, id, pid).run();
    let r; try { r = await run(); } catch (e) { await ensure(env.DB); await addName(env.DB); r = await run(); }
    if (!r.meta || !r.meta.changes) return json({ error: 'not owner' }, 403);
    return json({ ok: true, name: name || defName(pid) });
  }
  if (!goodPid(pid) || !(n >= 1 && n <= 6)) return json({ error: 'bad request' }, 400);
  const mint = (Array.isArray(body.mint) ? body.mint : []).map(x => Math.floor(Number(x)))
    .filter(x => x > 0 && x < 99000).slice(0, 6);
  const db = env.DB, now = Date.now(), w = Math.floor(now / WIN_MS), iph = await ipHash(request, env);

  return withTables(db, async () => {
    // 1. rate window (one statement per key, returns the running count)
    const bump = k => db.prepare('INSERT INTO luxq (k, w, n) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN w = ?2 THEN n + ?3 ELSE ?3 END, w = ?2 RETURNING n').bind(k, w, n);
    const [a, b] = await db.batch([bump('i:' + iph), bump('p:' + pid)]);
    const cnt = Math.max(a.results[0].n, b.results[0].n);
    if (cnt > WIN_MAX) return json({ lux: null, mints: {}, slow: true });

    // 2. mint serials: every SR+ copy pulled gets the next number for that card
    const mints = {};
    if (mint.length) {
      const rs = await db.batch(mint.map(id => db.prepare('INSERT INTO mint (id, n) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1 RETURNING id, n').bind(id)));
      for (const r of rs) { const x = r.results[0]; if (x) mints[x.id] = Math.min(mints[x.id] || Infinity, x.n); }
    }

    // 3. LUX roll, decided here on the server
    // LUX drops stay OFF until env LUX_LIVE = "1" (Sean: server-rolled packs ship first)
    const p = Number(env.LUX_RATE) || LUX_P;
    let lux = null;
    if (env.LUX_LIVE === '1' && rand() < 1 - Math.pow(1 - p, n)) {
      const recent = await db.prepare('SELECT COUNT(*) AS c FROM lux WHERE iph = ? AND at > ?').bind(iph, now - IP_DAY).first();
      if (!recent || !recent.c) {
        await seed(db);
        const ids = LUX_IDS.join(',');
        // one statement = atomic: picks a random unclaimed LUX and claims it only if still unclaimed
        const r = await db.prepare(`UPDATE lux SET owner = ?1, iph = ?2, at = ?3 WHERE id = (SELECT id FROM lux WHERE owner IS NULL AND id IN (${ids}) ORDER BY random() LIMIT 1) AND owner IS NULL RETURNING id, at`).bind(pid, iph, now).first();
        if (r) lux = { id: r.id, at: r.at };
      }
    }
    return json({ lux, mints });
  });
}
