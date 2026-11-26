// Global "packs opened" counter for MYRIAD LEGENDS.
// Needs a D1 database bound to this Pages project as `DB`.
const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

async function ensure(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS counter (k TEXT PRIMARY KEY, n INTEGER NOT NULL)"),
    db.prepare("INSERT OR IGNORE INTO counter (k, n) VALUES ('packs', 0)"),
  ]);
}
async function total(db) {
  const r = await db.prepare("SELECT n FROM counter WHERE k = 'packs'").first();
  return r ? r.n : 0;
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ total: null, error: 'no database bound' }, 503);
  try { return json({ total: await total(env.DB) }); }
  catch (e) { await ensure(env.DB); return json({ total: await total(env.DB) }); }
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ total: null, error: 'no database bound' }, 503);
  let n = 0;
  try { n = Math.floor(Number((await request.json()).n)); } catch (e) {}
  // a player can open at most ~1 pack per few seconds; cap each report
  if (!(n >= 1 && n <= 30)) return json({ error: 'bad n' }, 400);
  const up = () => env.DB.prepare("UPDATE counter SET n = n + ? WHERE k = 'packs' RETURNING n").bind(n).first();
  let r;
  try { r = await up(); } catch (e) { r = null; }
  if (!r) { await ensure(env.DB); r = await up(); }
  return json({ total: r ? r.n : null });
}
