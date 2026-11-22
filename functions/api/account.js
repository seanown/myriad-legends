// Player accounts for MYRIAD LEGENDS (Sean 2026-11-22). D1 binding: DB.
//
// Every player gets a numeric # user ID (sequential from 100001) the first time they open the game
// (guest account). Google sign-in and 引繼碼 (transfer code) are identities that lock that account.
// The collection (card id -> count), stats, trophies and profile live in their own tables so that
// friends, trading, LUX one-copy ownership and 宗門 can be built on top. Everything else in the save
// (missions, story, team, groups, favourites…) stays as a JSON blob in accounts.state.
//
// Auth: each device holds a random session token (sent as "Authorization: Bearer <tok>"); only its
// SHA-256 is stored. Google: ID token checked with Google's tokeninfo; only the stable "sub" is kept.
//
// POST /api/account  body {action, ...}
//   hello   {save?, code?}          no token -> create guest account (imports this device's save,
//                                   or claims a legacy 引繼碼 from /api/save). token -> current account.
//   sync    {save}                  merge device save into account (counts never go down), returns merged save
//   put     {data}                  same as sync (fire-and-forget on page hide)
//   google  {credential, save?}     link Google to this account, or if that Google user already has an
//                                   account, merge this device into it and switch the device to it.
//   create  {}                      make a 引繼碼 for this account (or return the existing one)
//   get     {code}                  log in with a 引繼碼: merge this device into that account, switch to it
//   wipe    {}                      clear the collection (the game's 刪除收藏 button)
// GET /api/account                  -> {google: client id}
// GET /api/account?uid=100001       -> public profile {uid, name, av, show, stats}
//
// Step 1 (this file): packs are still rolled in the browser, so the server sanity-checks growth
// (cards gained vs. packs the timer allows) and flags outliers in accounts.flags. Step 2 will move
// pack rolls to the server before LUX or trading go live.

const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const GOOGLE_ID = '144165557546-ulqf37rg47kip9e42n1k099aqdid7nff.apps.googleusercontent.com';
const gid = env => env.GOOGLE_CLIENT_ID || GOOGLE_ID;
const FIRST_UID = 100001;
const MAX_SAVE = 900000;
const MAX_CARD_ID = 10000000;
const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS accounts (
     uid INTEGER PRIMARY KEY, created INTEGER NOT NULL, updated INTEGER NOT NULL, seen INTEGER NOT NULL,
     state TEXT NOT NULL DEFAULT '{}', packs_opened INTEGER NOT NULL DEFAULT 0, pulls INTEGER NOT NULL DEFAULT 0,
     cards INTEGER NOT NULL DEFAULT 0, kinds INTEGER NOT NULL DEFAULT 0, flags INTEGER NOT NULL DEFAULT 0,
     merged_into INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (tok TEXT PRIMARY KEY, uid INTEGER NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid)`,
  `CREATE TABLE IF NOT EXISTS identities (provider TEXT NOT NULL, subject TEXT NOT NULL, uid INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (provider, subject))`,
  `CREATE INDEX IF NOT EXISTS identities_uid ON identities(uid)`,
  `CREATE TABLE IF NOT EXISTS inventory (uid INTEGER NOT NULL, card INTEGER NOT NULL, n INTEGER NOT NULL, first INTEGER NOT NULL, PRIMARY KEY (uid, card))`,
  `CREATE INDEX IF NOT EXISTS inventory_card ON inventory(card)`,
  `CREATE TABLE IF NOT EXISTS trophies (uid INTEGER NOT NULL, tid TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (uid, tid))`,
  `CREATE TABLE IF NOT EXISTS profiles (uid INTEGER PRIMARY KEY, name TEXT, av TEXT, show TEXT, at INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, at INTEGER NOT NULL, kind TEXT NOT NULL, info TEXT)`,
];
async function ensure(db) { await db.batch(SCHEMA.map(s => db.prepare(s))); }

const b64u = a => btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sha(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const newTok = () => b64u(crypto.getRandomValues(new Uint8Array(24)));
function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(10)); let s = '';
  for (let i = 0; i < 10; i++) s += ABC[b[i] % ABC.length];
  return 'ML-' + s.slice(0, 5) + '-' + s.slice(5);
}
const normCode = c => {
  const s = String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^ML/, '');
  return s.length === 10 ? 'ML-' + s.slice(0, 5) + '-' + s.slice(5) : null;
};
const int = (v, max = 1e12) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };

async function googleSub(env, cred) {
  if (!cred) return null;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
  if (!r.ok) return null;
  const t = await r.json();
  if (t.aud !== gid(env)) return null;
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') return null;
  if (Number(t.exp) * 1000 < Date.now()) return null;
  return t.sub ? String(t.sub) : null;
}

// ---- save <-> tables ----
// Split a client save into the parts we keep in tables and the rest (blob).
function parseSave(raw) {
  let o = raw;
  if (typeof raw === 'string') { if (raw.length > MAX_SAVE) return null; try { o = JSON.parse(raw); } catch (e) { return null; } }
  if (!o || typeof o !== 'object' || typeof o.owned !== 'object' || !o.owned) return null;
  const owned = new Map();
  for (const [k, v] of Object.entries(o.owned)) {
    const id = Number(k), n = int(v, 1e6);
    if (Number.isInteger(id) && id > 0 && id < MAX_CARD_ID && n > 0) owned.set(id, n);
  }
  const order = o.order && typeof o.order === 'object' ? o.order : {};
  const trophies = o.trophies && typeof o.trophies === 'object' ? o.trophies : {};
  const prof = o.profile && typeof o.profile === 'object' ? o.profile : null;
  const rest = Object.assign({}, o);
  for (const k of ['owned', 'order', 'trophies', 'cloud', 'acct', 'lang', 'profile']) delete rest[k];
  const state = JSON.stringify(rest);
  if (state.length > MAX_SAVE) return null;
  return { owned, order, trophies, prof, rest, state, packs: int(o.packsOpened), pulls: int(o.pulls) };
}

async function loadSave(db, uid) {
  const [a, inv, tr, pr] = await db.batch([
    db.prepare('SELECT * FROM accounts WHERE uid = ?').bind(uid),
    db.prepare('SELECT card, n, first FROM inventory WHERE uid = ?').bind(uid),
    db.prepare('SELECT tid, at FROM trophies WHERE uid = ?').bind(uid),
    db.prepare('SELECT name, av, show, at FROM profiles WHERE uid = ?').bind(uid),
  ]);
  const acc = a.results[0];
  if (!acc) return null;
  let o = {}; try { o = JSON.parse(acc.state) || {}; } catch (e) {}
  o.owned = {}; o.order = {};
  for (const r of inv.results) { o.owned[r.card] = r.n; o.order[r.card] = r.first; }
  o.trophies = {}; for (const r of tr.results) o.trophies[r.tid] = r.at;
  const p = pr.results[0];
  if (p) { let show = []; try { show = JSON.parse(p.show || '[]'); } catch (e) {} o.profile = { name: p.name || '', av: p.av || '', show, at: p.at }; }
  o.packsOpened = Math.max(o.packsOpened || 0, acc.packs_opened); o.pulls = Math.max(o.pulls || 0, acc.pulls);
  return { acc, save: o };
}

// Blob merge on the server: same rules as the game's mergeSave(), newest wins for the rest.
function mergeState(oldS, nw) {
  const o = Object.assign({}, oldS, nw);
  const mx = k => { o[k] = Math.max(int(oldS[k]), int(nw[k])); };
  ['pulls', 'packsOpened', 'stamps', 'bestStreak'].forEach(mx);
  o.fav = Object.assign({}, oldS.fav || {}, nw.fav || {});
  const g = Object.assign({}, oldS.groups || {});
  for (const [k, ids] of Object.entries(nw.groups || {})) if (Array.isArray(ids)) g[k] = [...new Set([...(g[k] || []), ...ids])];
  o.groups = g;
  const a = oldS.story || {}, b = nw.story || {};
  o.story = ((b.arch || 0) > (a.arch || 0) || ((b.arch || 0) === (a.arch || 0) && (b.stage || 0) >= (a.stage || 0))) ? b : a;
  if (oldS.boss && nw.boss) o.boss = Object.assign({}, nw.boss, { kills: Math.max(oldS.boss.kills || 0, nw.boss.kills || 0) });
  if (oldS.coins || nw.coins) o.coins = Object.assign({}, oldS.coins || {}, nw.coins || {});
  if (Array.isArray(oldS.showcase) && oldS.showcase.length && !(Array.isArray(nw.showcase) && nw.showcase.length)) o.showcase = oldS.showcase;
  return o;
}

// Write a parsed save into account uid. Counts only go up. Returns stats about the change.
async function applySave(db, uid, p, now, opts = {}) {
  const cur = await loadSave(db, uid);
  if (!cur) throw new Error('no account');
  const { acc, save } = cur;
  const add = [];
  let gained = 0;
  for (const [id, n] of p.owned) {
    const had = save.owned[id] || 0;
    if (n > had) { gained += n - had; add.push([id, n, int(p.order[id]) || now]); }
  }
  // Sanity check (step 1, packs still rolled in the browser): 6 cards per pack, 1 pack per minute plus
  // a stock of 10 and generous daily bonuses. Imports (first upload, merges) are exempt but audited.
  const mins = Math.max(1, (now - acc.updated) / 60000);
  const allow = 6 * (10 + mins + 30) * 1.5;
  let flag = 0;
  if (!opts.import && gained > allow) flag = 1;
  const stmts = [];
  for (let i = 0; i < add.length; i += 25) {
    const ch = add.slice(i, i + 25);
    stmts.push(db.prepare(`INSERT INTO inventory (uid, card, n, first) VALUES ${ch.map(() => '(?,?,?,?)').join(',')}
      ON CONFLICT(uid, card) DO UPDATE SET n = MAX(n, excluded.n)`).bind(...ch.flatMap(([id, n, f]) => [uid, id, n, f])));
  }
  const tr = Object.entries(p.trophies).filter(([k]) => !(k in save.trophies) && k.length <= 64).slice(0, 500);
  for (let i = 0; i < tr.length; i += 30) {
    const ch = tr.slice(i, i + 30);
    stmts.push(db.prepare(`INSERT OR IGNORE INTO trophies (uid, tid, at) VALUES ${ch.map(() => '(?,?,?)').join(',')}`).bind(...ch.flatMap(([k, v]) => [uid, k, int(v) || now])));
  }
  if (p.prof && int(p.prof.at) > ((save.profile && save.profile.at) || 0)) {
    const show = Array.isArray(p.prof.show) ? p.prof.show.slice(0, 3).map(x => int(x)).filter(Boolean) : [];
    stmts.push(db.prepare('INSERT INTO profiles (uid, name, av, show, at) VALUES (?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name, av=excluded.av, show=excluded.show, at=excluded.at')
      .bind(uid, String(p.prof.name || '').slice(0, 20), String(p.prof.av || '').slice(0, 40), JSON.stringify(show), int(p.prof.at)));
  }
  let oldState = {}; try { oldState = JSON.parse(acc.state) || {}; } catch (e) {}
  const merged = JSON.stringify(mergeState(oldState, p.rest));
  stmts.push(db.prepare(`UPDATE accounts SET state = ?, updated = ?, seen = ?, packs_opened = MAX(packs_opened, ?), pulls = MAX(pulls, ?), flags = flags | ?,
      cards = (SELECT COALESCE(SUM(n),0) FROM inventory WHERE uid = ?), kinds = (SELECT COUNT(*) FROM inventory WHERE uid = ?) WHERE uid = ?`)
    .bind(merged.length > MAX_SAVE ? acc.state : merged, now, now, p.packs, p.pulls, flag, uid, uid, uid));
  if (flag || (opts.import && gained > 0)) stmts.push(db.prepare('INSERT INTO audit (uid, at, kind, info) VALUES (?,?,?,?)')
    .bind(uid, now, flag ? 'suspect' : (opts.import || 'import'), JSON.stringify({ gained, allow: Math.round(allow), mins: Math.round(mins) })));
  await db.batch(stmts);
  return { gained, flag };
}

async function createAccount(db, now) {
  const r = await db.prepare(`INSERT INTO accounts (uid, created, updated, seen) VALUES ((SELECT COALESCE(MAX(uid), ?) + 1 FROM accounts), ?, ?, ?) RETURNING uid`)
    .bind(FIRST_UID - 1, now, now, now).first();
  return r.uid;
}
async function newSession(db, uid, now) {
  const tok = newTok();
  await db.prepare('INSERT INTO sessions (tok, uid, created, seen) VALUES (?,?,?,?)').bind(await sha(tok), uid, now, now).run();
  return tok;
}
async function authUid(db, request) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,64})$/.exec(request.headers.get('authorization') || '');
  if (!m) return null;
  const h = await sha(m[1]);
  const r = await db.prepare('SELECT s.uid, a.merged_into FROM sessions s JOIN accounts a ON a.uid = s.uid WHERE s.tok = ?').bind(h).first();
  if (!r) return null;
  if (r.merged_into) { await db.prepare('UPDATE sessions SET uid = ? WHERE tok = ?').bind(r.merged_into, h).run(); return r.merged_into; }
  return r.uid;
}
async function links(db, uid) {
  const r = await db.prepare('SELECT provider, subject FROM identities WHERE uid = ?').bind(uid).all();
  const o = { g: 0, code: null };
  for (const x of r.results) { if (x.provider === 'google') o.g = 1; if (x.provider === 'code') o.code = x.subject; }
  return o;
}
async function reply(db, uid, extra = {}) {
  const cur = await loadSave(db, uid);
  const l = await links(db, uid);
  return json(Object.assign({ uid, g: l.g, code: l.code, data: JSON.stringify(cur.save), updated: cur.acc.updated }, extra));
}
// Merge guest account `from` (this device's unprotected guest) into account `into` and retire it.
// Cards are ADDED (two different accounts earned them separately); this runs once per guest because the
// inventory copy and the retirement happen in one transaction guarded by merged_into IS NULL.
// A protected account (has Google or a code) is never merged or retired: the device just switches.
async function mergeInto(db, from, into, now) {
  if (from === into) return false;
  const l = await links(db, from);
  if (l.g || l.code) return false;
  const cur = await loadSave(db, from);
  if (!cur || cur.acc.merged_into) return false;
  const p = parseSave(cur.save);
  if (p) { p.owned = new Map(); await applySave(db, into, p, now, { import: 'merge:' + from }); }
  await db.batch([
    db.prepare(`INSERT INTO inventory (uid, card, n, first) SELECT ?, card, n, first FROM inventory
       WHERE uid = ? AND (SELECT merged_into FROM accounts WHERE uid = ?) IS NULL
       ON CONFLICT(uid, card) DO UPDATE SET n = n + excluded.n, first = MIN(first, excluded.first)`).bind(into, from, from),
    db.prepare('UPDATE accounts SET merged_into = ? WHERE uid = ? AND merged_into IS NULL').bind(into, from),
    db.prepare('UPDATE sessions SET uid = ? WHERE uid = ?').bind(into, from),
    db.prepare(`UPDATE accounts SET cards = (SELECT COALESCE(SUM(n),0) FROM inventory WHERE uid = ?), kinds = (SELECT COUNT(*) FROM inventory WHERE uid = ?), updated = ? WHERE uid = ?`).bind(into, into, now, into),
  ]);
  return true;
}
// Legacy /api/save data (transfer codes made before accounts existed).
async function legacyCode(db, code) {
  try { return await db.prepare('SELECT data FROM saves WHERE code = ?').bind(code).first(); } catch (e) { return null; }
}
async function legacyGoogle(db, sub) {
  try { const r = await db.prepare('SELECT code FROM gusers WHERE sub = ?').bind('g:' + sub).first(); return r && r.code; } catch (e) { return null; }
}
// Find (or build from legacy data) the account that owns transfer code `code`.
async function uidForCode(db, code, now) {
  const id = await db.prepare("SELECT uid FROM identities WHERE provider = 'code' AND subject = ?").bind(code).first();
  if (id) return id.uid;
  const old = await legacyCode(db, code);
  if (!old) return null;
  const p = parseSave(old.data);
  const uid = await createAccount(db, now);
  if (p) await applySave(db, uid, p, now, { import: 'legacy-code' });
  await db.prepare('INSERT OR IGNORE INTO identities (provider, subject, uid, created) VALUES (?,?,?,?)').bind('code', code, uid, now).run();
  const again = await db.prepare("SELECT uid FROM identities WHERE provider = 'code' AND subject = ?").bind(code).first();
  return again.uid;
}

export async function onRequestGet({ env, request }) {
  const u = new URL(request.url).searchParams.get('uid');
  if (!u) return json({ google: gid(env) });
  if (!env.DB) return json({ error: 'no database bound' }, 503);
  const uid = int(u);
  const run = async () => {
    const a = await env.DB.prepare('SELECT uid, created, packs_opened, pulls, cards, kinds, merged_into FROM accounts WHERE uid = ?').bind(uid).first();
    if (!a || a.merged_into) return json({ error: 'not found' }, 404);
    const p = await env.DB.prepare('SELECT name, av, show FROM profiles WHERE uid = ?').bind(uid).first();
    let show = []; try { show = JSON.parse((p && p.show) || '[]'); } catch (e) {}
    return json({ uid, since: a.created, name: (p && p.name) || '', av: (p && p.av) || '', show, stats: { packs: a.packs_opened, pulls: a.pulls, cards: a.cards, kinds: a.kinds } });
  };
  try { return await run(); } catch (e) { await ensure(env.DB); return await run(); }
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: 'no database bound' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  if (JSON.stringify(body).length > MAX_SAVE * 1.2) return json({ error: 'save too large' }, 413);
  const db = env.DB;
  const run = async () => {
    const now = Date.now();
    const action = body.action;
    let uid = await authUid(db, request);
    const save = body.save != null ? body.save : body.data;

    if (action === 'hello') {
      if (uid) { await db.prepare('UPDATE accounts SET seen = ? WHERE uid = ?').bind(now, uid).run(); return reply(db, uid); }
      // New device. If it still holds a legacy transfer code, claim that account; otherwise make a guest.
      const code = normCode(body.code);
      let fromCode = code ? await uidForCode(db, code, now) : null;
      uid = fromCode || await createAccount(db, now);
      const p = save != null ? parseSave(save) : null;
      if (p) await applySave(db, uid, p, now, { import: fromCode ? 'device+code' : 'first-open' });
      const tok = await newSession(db, uid, now);
      return reply(db, uid, { tok, created: !fromCode });
    }
    if (action === 'google') {
      const sub = await googleSub(env, body.credential);
      if (!sub) return json({ error: 'google sign-in failed' }, 401);
      let owner = await db.prepare("SELECT uid FROM identities WHERE provider = 'google' AND subject = ?").bind(sub).first();
      let target = owner && owner.uid;
      if (!target) {
        // Signed in with Google before accounts existed? Their old save is behind a transfer code.
        const lc = await legacyGoogle(db, sub);
        if (lc) target = await uidForCode(db, lc, now);
      }
      if (!uid) { uid = target || await createAccount(db, now); }
      const p = save != null ? parseSave(save) : null;
      if (p) await applySave(db, uid, p, now, { import: 'google-device' });
      if (target && target !== uid) { await mergeInto(db, uid, target, now); uid = target; }
      await db.prepare('INSERT OR IGNORE INTO identities (provider, subject, uid, created) VALUES (?,?,?,?)').bind('google', sub, uid, now).run();
      // Another device may have linked this Google user at the same moment: the stored owner wins.
      owner = await db.prepare("SELECT uid FROM identities WHERE provider = 'google' AND subject = ?").bind(sub).first();
      if (owner.uid !== uid) { await mergeInto(db, uid, owner.uid, now); uid = owner.uid; }
      const tok = await newSession(db, uid, now);
      return reply(db, uid, { tok });
    }
    if (action === 'get') {
      const code = normCode(body.code);
      if (!code) return json({ error: 'bad code' }, 400);
      const target = await uidForCode(db, code, now);
      if (!target) return json({ error: 'not found' }, 404);
      if (uid && uid !== target) {
        const p = save != null ? parseSave(save) : null;
        if (p) await applySave(db, uid, p, now, { import: 'code-device' });
        await mergeInto(db, uid, target, now);
      }
      const tok = await newSession(db, target, now);
      return reply(db, target, { tok });
    }

    if (!uid) return json({ error: 'no session' }, 401);
    if (action === 'sync' || action === 'put') {
      const p = parseSave(save);
      if (!p) return json({ error: 'bad save' }, 400);
      await applySave(db, uid, p, now);
      return action === 'put' ? json({ uid, updated: now }) : reply(db, uid);
    }
    if (action === 'create') {
      const l = await links(db, uid);
      if (l.code) return reply(db, uid);
      for (let i = 0; i < 5; i++) {
        const r = await db.prepare('INSERT OR IGNORE INTO identities (provider, subject, uid, created) VALUES (?,?,?,?)').bind('code', newCode(), uid, now).run();
        if (r.meta && r.meta.changes) return reply(db, uid);
      }
      return json({ error: 'try again' }, 500);
    }
    if (action === 'wipe') {
      await db.batch([
        db.prepare('DELETE FROM inventory WHERE uid = ?').bind(uid),
        db.prepare('DELETE FROM trophies WHERE uid = ?').bind(uid),
        db.prepare("UPDATE accounts SET cards = 0, kinds = 0, packs_opened = 0, pulls = 0, state = '{}', updated = ? WHERE uid = ?").bind(now, uid),
        db.prepare('INSERT INTO audit (uid, at, kind) VALUES (?,?,?)').bind(uid, now, 'wipe'),
      ]);
      return reply(db, uid);
    }
    return json({ error: 'bad action' }, 400);
  };
  try { return await run(); }
  catch (e) {
    if (!/no such table/i.test(String(e && e.message))) { console.error('account', e); return json({ error: 'server error' }, 500); }
    await ensure(db); return await run();
  }
}
