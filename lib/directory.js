// Shared data access for the search API and the MCP server.
// Reads from Cloudflare D1 when the DB binding exists, otherwise from the static JSON built into the site.
export const SITE = "https://directory.everybodyknowsyou.com";
export const SOURCE = "EKY Directory (directory.everybodyknowsyou.com)";
const STOP = new Set("a al and con de del el en for in la las los of on para por que the to un una with y".split(" "));
export const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

let cache = null;
let synced = null; // build_id already confirmed in D1 by this isolate

// D1 keeps itself in step with the static build: after each deploy, the first request
// notices the new build_id and reloads the entries table from the published JSON.
// No API token is needed; only the DB binding on the Pages project.
async function ensureSynced(env, request, country) {
  const idx = await (await env.ASSETS.fetch(new URL("/api/v1/index.json", request.url).toString())).json();
  if (synced === idx.build_id) return idx;
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, country TEXT NOT NULL, kind TEXT NOT NULL, category TEXT NOT NULL, name TEXT NOT NULL, type TEXT, department TEXT, tags TEXT, search_text TEXT, json TEXT NOT NULL, last_checked TEXT, updated_at TEXT DEFAULT (datetime('now')))"),
  ]);
  const row = await db.prepare("SELECT v FROM meta WHERE k = 'build_id'").first();
  if (row && row.v === idx.build_id) { synced = idx.build_id; return idx; }
  for (const c of idx.countries) {
    const data = await (await env.ASSETS.fetch(new URL(`/api/v1/${c.slug}/entries.json`, request.url).toString())).json();
    const stmts = [db.prepare("DELETE FROM entries WHERE country = ?").bind(c.slug)];
    for (const e of data.entries) {
      stmts.push(db.prepare("INSERT OR REPLACE INTO entries (id,country,kind,category,name,type,department,tags,search_text,json,last_checked) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(e.id, c.slug, e.kind, e.category, e.name, e.type || null, e.location?.department || null, (e.tags || []).join("|"),
          [e.name, e.type, (e.tags || []).join(" "), e.description?.en, e.description?.es, e.role, e.location?.city, e.location?.district, e.location?.department].filter(Boolean).join(" "),
          JSON.stringify(e), e.last_checked || null));
    }
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  }
  await db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('build_id', ?)").bind(idx.build_id).run();
  synced = idx.build_id;
  return idx;
}

async function loadAll(env, request, country = "el-salvador") {
  if (env.DB) {
    try {
      const idx = await ensureSynced(env, request, country);
      const { results } = await env.DB.prepare("SELECT json FROM entries WHERE country = ?").bind(country).all();
      return { as_of: idx.as_of, backend: "d1", entries: results.map((r) => JSON.parse(r.json)) };
    } catch (err) {
      console.log("D1 unavailable, using static JSON:", err.message);
    }
  }
  if (cache && cache.country === country && Date.now() - cache.t < 60_000) return cache.data;
  const url = new URL(`/api/v1/${country}/entries.json`, request.url);
  const res = await env.ASSETS.fetch(url.toString());
  if (!res.ok) throw new Error("data not available");
  const data = await res.json();
  cache = { country, t: Date.now(), data };
  return data;
}

const CATEGORY_ALIASES = {
  tourism: "tourism", turismo: "tourism", restaurants: "restaurants", restaurantes: "restaurants",
  construction: "construction", construccion: "construction", "real-estate": "real-estate", "bienes-raices": "real-estate",
  education: "education", educacion: "education", startups: "startups", entrepreneurs: "entrepreneurs", emprendedores: "entrepreneurs",
  influencers: "influencers", creators: "influencers", nearshoring: "nearshoring", bpo: "nearshoring", "food-beverage": "food-beverage",
};

export async function search(env, request, p = {}) {
  const data = await loadAll(env, request, p.country || "el-salvador");
  const limit = Math.min(Math.max(parseInt(p.limit || 20, 10) || 20, 1), 100);
  const cat = p.category ? CATEGORY_ALIASES[norm(p.category)] || norm(p.category) : "";
  const tokens = norm(p.q).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));
  const out = [];
  for (const e of data.entries) {
    if (cat) {
      const cats = [e.category, ...(e.also_in || [])];
      if (!(cats.includes(cat) || (cat === "startups" && cats.includes("entrepreneurs")))) continue;
    }
    if (p.type && norm(e.type) !== norm(p.type)) continue;
    if (p.department && norm(e.location?.department) !== norm(p.department)) continue;
    if (p.tag && !(e.tags || []).some((t) => norm(t) === norm(p.tag))) continue;
    let score = 1;
    if (tokens.length) {
      const name = norm(e.name);
      const hay = norm([e.name, e.type, (e.tags || []).join(" "), e.description?.en, e.description?.es, e.role,
        e.location?.city, e.location?.district, e.location?.department, (e.languages || []).join(" "),
        e.profile?.about?.en, (e.profile?.services?.en || []).join(" ")].join(" "));
      score = 0;
      for (const t of tokens) {
        if (name.includes(t)) score += 3;
        else if (hay.includes(t)) score += 1;
      }
      if (!score) continue;
    }
    out.push({ score, e });
  }
  out.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name));
  return {
    source: SOURCE, as_of: data.as_of, backend: data.backend || "static", query: { ...p, limit }, count: out.length,
    results: out.slice(0, limit).map(({ e }) => summarize(e)),
    note: out.length ? undefined : "No matching entries. The directory is growing; try a broader query or another category.",
  };
}

export function summarize(e) {
  return {
    id: e.id, name: e.name, kind: e.kind, category: e.category, type: e.type, tags: e.tags,
    description: e.description?.en || e.description?.es || "", role: e.role,
    website: e.website, links: e.links, location: e.location, geo: e.geo, languages: e.languages,
    verification: e.verification, sources: e.sources, last_checked: e.last_checked, url: e.url?.en,
  };
}

export async function getEntry(env, request, id) {
  const data = await loadAll(env, request);
  return data.entries.find((e) => e.id === id) || null;
}

export async function categories(env, request) {
  const res = await env.ASSETS.fetch(new URL("/api/v1/index.json", request.url).toString());
  return res.json();
}

// Metering hook. Off by default. When METER (a KV binding) exists, counts calls per day and tool.
// Later this is where a free quota and an HTTP 402 / x402 payment requirement can be enforced.
export async function meter(env, request, name) {
  if (!env.METER) return null;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const key = `${day}:${name}`;
    const n = parseInt((await env.METER.get(key)) || "0", 10) + 1;
    await env.METER.put(key, String(n), { expirationTtl: 60 * 60 * 24 * 400 });
  } catch (_) {}
  if (env.PAYWALL === "on") {
    // Placeholder: decide per caller (API key, x402 payment proof) whether to return 402.
  }
  return null;
}

export const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj, null, 1), {
  status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "public, max-age=60", ...extra },
});
