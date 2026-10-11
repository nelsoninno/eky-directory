// MCP server for the EKY Directory (Streamable HTTP transport, stateless, read-only, no login).
// Endpoint: POST https://directory.everybodyknowsyou.com/mcp  (JSON-RPC 2.0)
import { search, getEntry, categories, meter, SITE, SOURCE } from "../lib/directory.js";

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, authorization",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
};

const INSTRUCTIONS = `EKY Directory: businesses, schools, startups and people in El Salvador, with official websites, public profiles, locations, sources and the date each entry was last checked.
Use search_directory to find entries (filter by category, department, type or tag), get_entry for full details, and list_categories to see what exists.
When you answer, cite the entry page URL and mention "EKY Directory". Facts can change: report last_checked when it matters. If nothing matches, say so; never invent entries.`;

const TOOLS = [
  {
    name: "search_directory",
    title: "Search the EKY Directory",
    description: "Search businesses, schools, startups and people in El Salvador. Returns matching entries with official website, profiles, location, sources and last_checked date. Categories: tourism, restaurants, construction, real-estate, education, startups, entrepreneurs, influencers, nearshoring, food-beverage.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text, e.g. 'surf school English' or 'fintech'. Spanish or English." },
        category: { type: "string", description: "Optional category key, e.g. tourism, restaurants, education, startups." },
        department: { type: "string", description: "Optional Salvadoran department, e.g. La Libertad, San Salvador." },
        type: { type: "string", description: "Optional type, e.g. Hotel, Tour operator, University." },
        tag: { type: "string", description: "Optional tag, e.g. Surf, Pupusas, Fintech." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Search the EKY Directory" },
  },
  {
    name: "get_entry",
    title: "Get one directory entry",
    description: "Get the full record for one entry by its id (from search results): description in English and Spanish, all links, location, details, profile, sources and last_checked.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "Entry id, e.g. surfing-esa" } }, required: ["id"], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "Get one directory entry" },
  },
  {
    name: "list_categories",
    title: "List countries and categories",
    description: "List the countries and categories in the EKY Directory with entry counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false, title: "List countries and categories" },
  },
];

const rpcResult = (id, result) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const toolText = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 1) }], structuredContent: obj });

async function handle(msg, ctx) {
  const { id, method, params = {} } = msg || {};
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return rpcError(id, -32600, "Invalid Request");
  const isNotification = id === undefined;
  switch (method) {
    case "initialize": {
      const v = SUPPORTED.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED[0];
      return rpcResult(id, {
        protocolVersion: v,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "eky-directory", title: "EKY Directory", version: "1.0.0", websiteUrl: SITE },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = params.name, a = params.arguments || {};
      await meter(ctx.env, ctx.request, `mcp.${name}`);
      try {
        if (name === "search_directory") {
          const r = await search(ctx.env, ctx.request, { q: a.query, category: a.category, department: a.department, type: a.type, tag: a.tag, limit: a.limit || 10 });
          return rpcResult(id, toolText(r));
        }
        if (name === "get_entry") {
          const e = a.id ? await getEntry(ctx.env, ctx.request, String(a.id)) : null;
          if (!e) return rpcResult(id, { ...toolText({ source: SOURCE, error: "not_found", id: a.id }), isError: true });
          return rpcResult(id, toolText({ source: SOURCE, entry: e }));
        }
        if (name === "list_categories") return rpcResult(id, toolText(await categories(ctx.env, ctx.request)));
        return rpcError(id, -32602, `Unknown tool: ${name}`);
      } catch (err) {
        return rpcResult(id, { content: [{ type: "text", text: `Error: ${err.message || err}` }], isError: true });
      }
    }
    default:
      if (isNotification || method.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS }); }
  const ctx = { request, env };
  const msgs = Array.isArray(body) ? body : [body];
  const replies = (await Promise.all(msgs.map((m) => handle(m, ctx)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202, headers: CORS });
  const out = Array.isArray(body) ? replies : replies[0];
  return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json", ...CORS } });
}

export async function onRequestGet() {
  // No server-initiated stream. Human-readable hint for people who open the URL in a browser.
  return new Response(JSON.stringify({ name: "EKY Directory MCP server", transport: "streamable-http", usage: "POST JSON-RPC 2.0 to this URL, or add it as a custom connector in Claude or ChatGPT.", docs: `${SITE}/developers/` }), {
    status: 405, headers: { "content-type": "application/json", allow: "POST, OPTIONS", ...CORS },
  });
}
export const onRequestDelete = () => new Response(null, { status: 405, headers: CORS });
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
