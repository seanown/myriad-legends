// Run: node tests/account.test.mjs   (uses node:sqlite as a stand-in for Cloudflare D1)
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { onRequestPost, onRequestGet } from '../functions/api/account.js';

function d1(sql) {
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    _run() { const st = sql.prepare(q); return /^\s*(SELECT|.*RETURNING)/is.test(q) ? { results: st.all(...args), meta: {} } : { results: [], meta: { changes: Number(st.run(...args).changes) } }; },
    async run() { return this._run(); },
    async first() { return this._run().results[0] || null; },
    async all() { return this._run(); },
  });
  return {
    prepare: q => stmt(q),
    async batch(list) { sql.exec('BEGIN'); try { const r = list.map(s => s._run()); sql.exec('COMMIT'); return r; } catch (e) { sql.exec('ROLLBACK'); throw e; } },
  };
}
const sql = new DatabaseSync(':memory:');
const env = { DB: d1(sql) };
globalThis.fetch = async url => {
  const t = new URL(url).searchParams.get('id_token');
  if (!t.startsWith('ok-')) return new Response('{}', { status: 400 });
  return new Response(JSON.stringify({ aud: '144165557546-ulqf37rg47kip9e42n1k099aqdid7nff.apps.googleusercontent.com', iss: 'https://accounts.google.com', exp: String(Date.now() / 1000 + 600), sub: t.slice(3) }));
};
async function call(body, tok) {
  const h = { 'content-type': 'application/json' }; if (tok) h.authorization = 'Bearer ' + tok;
  const r = await onRequestPost({ env, request: new Request('https://x/api/account', { method: 'POST', headers: h, body: JSON.stringify(body) }) });
  return { status: r.status, ...(await r.json()) };
}
const sv = (owned, extra = {}) => JSON.stringify(Object.assign({ owned, order: {}, pulls: 6, packsOpened: 1, trophies: {}, story: { stage: 1 } }, extra));
const owned = j => JSON.parse(j.data).owned;

// 1. first open makes guest #100001 and imports this device's cards
const a = await call({ action: 'hello', save: sv({ 5: 1, 9: 2 }) });
assert.equal(a.status, 200); assert.equal(a.uid, 100001); assert.ok(a.tok); assert.deepEqual(owned(a), { 5: 1, 9: 2 });
assert.equal(a.g, 0); assert.equal(a.code, null);
// 2. another device is #100002
const b = await call({ action: 'hello', save: sv({ 7: 1 }) });
assert.equal(b.uid, 100002);
// 3. hello with a token returns the same account
assert.equal((await call({ action: 'hello' }, a.tok)).uid, 100001);
// 4. sync: counts only go up
let s = await call({ action: 'sync', save: sv({ 5: 3, 9: 1, 11: 1 }, { pulls: 18, packsOpened: 3 }) }, a.tok);
assert.deepEqual(owned(s), { 5: 3, 9: 2, 11: 1 });
assert.equal(JSON.parse(s.data).packsOpened, 3);
// bad save / no session
assert.equal((await call({ action: 'sync', save: '{"x":1}' }, a.tok)).status, 400);
assert.equal((await call({ action: 'sync', save: sv({}) })).status, 401);
assert.equal((await call({ action: 'sync', save: sv({}) }, 'A'.repeat(32))).status, 401);
// 5. transfer code: create, then device B logs in with it -> B's cards merge into #100001
const c = await call({ action: 'create' }, a.tok);
assert.match(c.code, /^ML-[0-9A-Z]{5}-[0-9A-Z]{5}$/);
assert.equal((await call({ action: 'create' }, a.tok)).code, c.code, 'create is idempotent');
const bl = await call({ action: 'get', code: c.code.toLowerCase().replace(/-/g, ' '), save: sv({ 7: 2 }) }, b.tok);
assert.equal(bl.uid, 100001); assert.ok(bl.tok); assert.deepEqual(owned(bl), { 5: 3, 9: 2, 11: 1, 7: 2 });
assert.equal((await call({ action: 'hello' }, b.tok)).uid, 100001, 'old session of the merged guest follows it');
assert.equal((await call({ action: 'get', code: 'ML-AAAAA-AAAAA' }, a.tok)).status, 404);
// 6. Google: link to the current guest; a new device signing in with the same Google gets that account
const g1 = await call({ action: 'google', credential: 'ok-111', save: sv({ 5: 1 }) }, a.tok);
assert.equal(g1.uid, 100001); assert.equal(g1.g, 1);
const d = await call({ action: 'hello', save: sv({ 99: 1 }) });
assert.equal(d.uid, 100003);
const g2 = await call({ action: 'google', credential: 'ok-111', save: sv({ 99: 1 }) }, d.tok);
assert.equal(g2.uid, 100001); assert.equal(owned(g2)[99], 1, 'new device cards are not lost');
assert.equal((await call({ action: 'google', credential: 'bad' }, d.tok)).status, 401);
// 6b. different accounts' duplicates add up when a guest merges in
const h = await call({ action: 'hello', save: sv({ 5: 2 }) });
const before = owned(await call({ action: 'hello' }, a.tok))[5];
const hm = await call({ action: 'google', credential: 'ok-111', save: sv({ 5: 2 }) }, h.tok);
assert.equal(owned(hm)[5], before + 2);
const hm2 = await call({ action: 'google', credential: 'ok-111', save: sv({ 5: 2 }) }, h.tok);
assert.equal(owned(hm2)[5], before + 2, 'merge happens once');
// 6c. a protected account signing into another account is not merged or retired
const x = await call({ action: 'hello', save: sv({ 777: 1 }) });
const xc = await call({ action: 'create' }, x.tok);
const xs = await call({ action: 'google', credential: 'ok-111', save: sv({ 777: 1 }) }, x.tok);
assert.equal(xs.uid, 100001); assert.equal(owned(xs)[777], undefined, 'protected account cards stay with it');
const xback = await call({ action: 'get', code: xc.code });
assert.equal(xback.uid, x.uid); assert.equal(owned(xback)[777], 1);
assert.equal((await call({ action: 'hello' }, x.tok)).uid, x.uid, "the other account's old session is not moved");
// 7. legacy /api/save codes and Google links migrate on first use
sql.exec("CREATE TABLE IF NOT EXISTS saves (code TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL)");
sql.exec("CREATE TABLE IF NOT EXISTS gusers (sub TEXT PRIMARY KEY, code TEXT NOT NULL, created INTEGER NOT NULL)");
sql.prepare('INSERT INTO saves VALUES (?,?,?,?)').run('ML-LEGAC-YCODE', sv({ 300: 4 }, { packsOpened: 50 }), 1, 1);
const lg = await call({ action: 'hello', code: 'ML-LEGAC-YCODE', save: sv({ 301: 1 }) });
assert.equal(lg.code, 'ML-LEGAC-YCODE'); assert.deepEqual(owned(lg), { 300: 4, 301: 1 }); assert.equal(lg.created, false);
const lg2 = await call({ action: 'hello', code: 'ML-LEGAC-YCODE', save: sv({}) });
assert.equal(lg2.uid, lg.uid, 'legacy code is claimed once');
sql.prepare('INSERT INTO saves VALUES (?,?,?,?)').run('ML-GOOGL-EOLD1', sv({ 400: 1 }), 1, 1);
sql.prepare('INSERT INTO gusers VALUES (?,?,?)').run('g:222', 'ML-GOOGL-EOLD1', 1);
const e = await call({ action: 'hello', save: sv({ 401: 1 }) });
const eg = await call({ action: 'google', credential: 'ok-222', save: sv({ 401: 1 }) }, e.tok);
assert.deepEqual(owned(eg), { 400: 1, 401: 1 }); assert.equal(eg.g, 1); assert.equal(eg.code, 'ML-GOOGL-EOLD1');
// 8. public profile
const prof = await call({ action: 'sync', save: sv({ 5: 3 }, { profile: { name: 'Sean'.padEnd(30, '!'), av: 'c:5', show: [5, 9, 11, 12], at: 10 } }) }, a.tok);
assert.equal(JSON.parse(prof.data).profile.name.length, 20);
const pub = await (await onRequestGet({ env, request: new Request('https://x/api/account?uid=100001') })).json();
assert.equal(pub.uid, 100001); assert.deepEqual(pub.show, [5, 9, 11]); assert.equal(pub.stats.kinds, 5);
assert.equal((await onRequestGet({ env, request: new Request('https://x/api/account?uid=100002') })).status, 404, 'merged guest has no profile');
assert.ok((await (await onRequestGet({ env, request: new Request('https://x/api/account') })).json()).google);
// 9. suspicious growth is accepted but flagged and audited
const big = {}; for (let i = 1; i <= 1000; i++) big[i] = 1;
await call({ action: 'sync', save: sv(big) }, d.tok);
assert.equal(sql.prepare('SELECT flags FROM accounts WHERE uid = 100001').get().flags, 1);
assert.ok(sql.prepare("SELECT COUNT(*) n FROM audit WHERE kind = 'suspect'").get().n >= 1);
// 10. wipe clears the collection
const w = await call({ action: 'wipe' }, a.tok);
assert.deepEqual(owned(w), {}); assert.equal(w.uid, 100001); assert.equal(w.g, 1);
console.log('account tests: all passed');
