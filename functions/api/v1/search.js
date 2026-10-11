import { search, meter, json } from "../../../lib/directory.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const p = Object.fromEntries(["q", "country", "category", "type", "tag", "department", "limit"].map((k) => [k, u.searchParams.get(k) || undefined]));
  const blocked = await meter(env, request, "api.search");
  if (blocked) return blocked;
  try {
    return json(await search(env, request, p));
  } catch (err) {
    return json({ error: "search_failed", message: String(err.message || err) }, 500);
  }
}
export const onRequestOptions = () => new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" } });
