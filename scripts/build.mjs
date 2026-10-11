// EKY Directory static site generator. Zero dependencies. Node 18+.
// Usage: node scripts/build.mjs [--preview]
//   --preview  include rows with Status "To review" and mark every page noindex (for private previews)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PREVIEW = process.argv.includes("--preview") || process.env.EKY_PREVIEW === "1";
const SITE = "https://directory.everybodyknowsyou.com";
const EKY = "https://everybodyknowsyou.com";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const MIN_ENTRIES_TO_INDEX_CATEGORY = 5;

// ------------------------------------------------------------------ load
const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const CATDATA = readJSON(path.join(ROOT, "data/categories.json"));
const TYPES = CATDATA.types;
const CATS = CATDATA.categories;
const CAT = Object.fromEntries(CATS.map((c) => [c.key, c]));
const COUNTRIES = fs.readdirSync(path.join(ROOT, "data/countries")).filter((f) => f.endsWith(".json"))
  .map((f) => readJSON(path.join(ROOT, "data/countries", f)));

const PUBLISH = PREVIEW ? ["Ready", "Published", "To review"] : ["Ready", "Published"];

function deepMerge(a, b) {
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k])) out[k] = deepMerge(a[k], v);
    else out[k] = v;
  }
  return out;
}

function loadEntries(country) {
  const dir = path.join(ROOT, "data/entries", country.slug);
  if (!fs.existsSync(dir)) return [];
  const all = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let e = readJSON(path.join(dir, f));
    if (!PUBLISH.includes(e.status)) continue;
    const prof = path.join(ROOT, "data/profiles", `${e.id}.json`);
    if (fs.existsSync(prof)) {
      const p = readJSON(prof);
      e = deepMerge(e, p.override || {});
      e.profile = { about: p.about, services: p.services, facts: p.facts, faq: p.faq };
    }
    delete e.notes;
    all.push(e);
  }
  return all.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// ------------------------------------------------------------------ i18n + urls
const T = {
  en: {
    lang: "English", other: "Español", dir: "Directory", by: "by EverybodyKnowsYou",
    tagline: "Find businesses, places and people, country by country. Built so people and AI can read it.",
    countries: "Countries", live: "Live", soon: "Coming soon", entries: (n) => `${n} ${n === 1 ? "entry" : "entries"}`,
    categories: "Categories", search: "Search by name, type or tag", allTypes: "All types", allDeps: "All departments",
    name: "Name", type: "Type", location: "Location", website: "Website", links: "Profiles", sector: "Sector",
    founders: "Founders", role: "Role", linkedin: "LinkedIn", personalSite: "Personal website",
    noSite: "No official website found", noPersonal: "No personal website found", none: "None found",
    map: "Map", onMap: (n) => `${n} on the map`, noMap: "Entries appear on the map once they have coordinates.",
    facts: "Facts", about: "About", services: "Services", faq: "Questions", source: "Source", lastChecked: "Last checked",
    sources: "Sources", fromPublic: "Facts from public sources", verified: "Profile built with the business (EverybodyKnowsYou client)",
    claim: "Is this you or your business?", claimText: "Ask us to correct, complete or remove this listing.", claimCta: "Write to us",
    department: "Department", municipality: "Municipality", district: "District", address: "Address", city: "City",
    languages: "Languages", bitcoin: "Accepts Bitcoin", yes: "Yes", no: "No", price: "Price range", booking: "Booking",
    hours: "Hours", menu: "Menu", reservations: "Reservations", founded: "Founded", stage: "Stage", programs: "Programs and investors",
    hiring: "Hiring", ventures: "Ventures", openTo: "Open to", tags: "Tags", alsoIn: "Also listed in", curriculum: "Curriculum",
    accreditation: "Accreditation", publicPrivate: "Public or private", markets: "Markets served", teamSize: "Team size",
    products: "Main products", exports: "Exports", exportMarkets: "Export markets", certifications: "Certifications",
    areaServed: "Areas served", memberships: "Memberships", zones: "Zones served", foreignBuyers: "Helps foreign and diaspora buyers",
    rnt: "In the Registro Nacional de Turismo", admissions: "Admissions", mainPlatform: "Main platform", audience: "Audience",
    startups: "Startups", entrepreneurs: "Entrepreneurs", people: "people", orgs: "organizations",
    forAI: "For AI and developers", forAIText: "Every entry is also available as JSON, through a search API and through an MCP server that AI assistants like Claude and ChatGPT can connect to.",
    seeDev: "See the API and MCP docs", aboutDir: "About this directory", home: "Home", noResults: "No entries match your search.",
    empty: "We are adding the first entries to this category.", notOfficial: "An independent directory by EverybodyKnowsYou. Not a government site.",
    download: "Download the data", builtBy: "Built by", makeFindable: "Want your business found by Google and AI?", eky: "Get a website in 3 days",
    previewNote: "Private preview. Not indexed.", viewAll: "View all", updated: "Updated", aboutShort: "About",
  },
  es: {
    lang: "Español", other: "English", dir: "Directorio", by: "por EverybodyKnowsYou",
    tagline: "Encuentra negocios, lugares y personas, país por país. Hecho para que lo lean las personas y la IA.",
    countries: "Países", live: "Activo", soon: "Próximamente", entries: (n) => `${n} ${n === 1 ? "entrada" : "entradas"}`,
    categories: "Categorías", search: "Busca por nombre, tipo o etiqueta", allTypes: "Todos los tipos", allDeps: "Todos los departamentos",
    name: "Nombre", type: "Tipo", location: "Ubicación", website: "Sitio web", links: "Perfiles", sector: "Sector",
    founders: "Fundadores", role: "Rol", linkedin: "LinkedIn", personalSite: "Sitio personal",
    noSite: "Sin sitio web oficial", noPersonal: "Sin sitio web personal", none: "No encontrado",
    map: "Mapa", onMap: (n) => `${n} en el mapa`, noMap: "Las entradas aparecen en el mapa cuando tienen coordenadas.",
    facts: "Datos", about: "Acerca de", services: "Servicios", faq: "Preguntas", source: "Fuente", lastChecked: "Última revisión",
    sources: "Fuentes", fromPublic: "Datos de fuentes públicas", verified: "Perfil hecho con el negocio (cliente de EverybodyKnowsYou)",
    claim: "¿Eres tú o es tu negocio?", claimText: "Pídenos corregir, completar o quitar esta entrada.", claimCta: "Escríbenos",
    department: "Departamento", municipality: "Municipio", district: "Distrito", address: "Dirección", city: "Ciudad",
    languages: "Idiomas", bitcoin: "Acepta Bitcoin", yes: "Sí", no: "No", price: "Rango de precio", booking: "Reservas",
    hours: "Horario", menu: "Menú", reservations: "Reservaciones", founded: "Fundación", stage: "Etapa", programs: "Programas e inversionistas",
    hiring: "Contratando", ventures: "Emprendimientos", openTo: "Abierto a", tags: "Etiquetas", alsoIn: "También en", curriculum: "Currículo",
    accreditation: "Acreditación", publicPrivate: "Público o privado", markets: "Mercados", teamSize: "Tamaño del equipo",
    products: "Productos principales", exports: "Exporta", exportMarkets: "Mercados de exportación", certifications: "Certificaciones",
    areaServed: "Zonas que atiende", memberships: "Membresías", zones: "Zonas", foreignBuyers: "Atiende a compradores extranjeros y de la diáspora",
    rnt: "En el Registro Nacional de Turismo", admissions: "Admisiones", mainPlatform: "Plataforma principal", audience: "Audiencia",
    startups: "Startups", entrepreneurs: "Emprendedores", people: "personas", orgs: "organizaciones",
    forAI: "Para la IA y desarrolladores", forAIText: "Cada entrada también está disponible en JSON, en una API de búsqueda y en un servidor MCP al que se pueden conectar asistentes de IA como Claude y ChatGPT.",
    seeDev: "Ver la documentación de la API y el MCP", aboutDir: "Acerca de este directorio", home: "Inicio", noResults: "Ninguna entrada coincide con tu búsqueda.",
    empty: "Estamos agregando las primeras entradas de esta categoría.", notOfficial: "Un directorio independiente de EverybodyKnowsYou. No es un sitio del gobierno.",
    download: "Descargar los datos", builtBy: "Hecho por", makeFindable: "¿Quieres que Google y la IA encuentren tu negocio?", eky: "Tu sitio web en 3 días",
    previewNote: "Vista previa privada. No indexada.", viewAll: "Ver todo", updated: "Actualizado", aboutShort: "Acerca",
  },
};
const SEG = {
  en: { organizations: "organizations", people: "people", about: "about", developers: "developers" },
  es: { organizations: "organizaciones", people: "personas", about: "acerca", developers: "desarrolladores" },
};
const prefix = (lang) => (lang === "es" ? "/es" : "");
const U = {
  home: (l) => `${prefix(l)}/`,
  country: (l, c) => `${prefix(l)}/${c.slug}/`,
  category: (l, c, cat) => `${prefix(l)}/${c.slug}/${CAT[cat.listedUnder || cat.key].slug[l]}/`,
  entry: (l, c, e) => `${prefix(l)}/${c.slug}/${e.kind === "person" ? SEG[l].people : SEG[l].organizations}/${e.id}/`,
  about: (l) => `${prefix(l)}/${SEG[l].about}/`,
  dev: (l) => `${prefix(l)}/${SEG[l].developers}/`,
};
const abs = (p) => SITE + p;

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tr = (obj, l) => (obj ? obj[l] || obj.en || obj.es || "" : "");
const typeLabel = (t, l) => (l === "es" ? TYPES[t]?.es || t : t);
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const LINK_LABEL = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube", x: "X" };
const yes = (v, l) => (v === true ? T[l].yes : v === false ? T[l].no : "");
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

function placeLine(e) {
  const L = e.location || {};
  const parts = [L.district || L.city, L.department].filter(Boolean);
  return [...new Set(parts)].join(", ");
}
function indexableEntry(e) {
  const d = tr(e.description, "en") || tr(e.description, "es");
  const hasLink = e.website || Object.values(e.links || {}).some(Boolean);
  return Boolean(d && hasLink && (e.sources || []).length);
}
function write(rel, content) {
  const p = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ------------------------------------------------------------------ layout
function layout({ l, title, description, canonical, alt, body, ld, robots = "index, follow", map = false, crumbs = [] }) {
  const noindex = PREVIEW || robots.startsWith("noindex");
  const altLang = l === "en" ? "es" : "en";
  const crumbHtml = crumbs.length
    ? `<nav class="crumbs" aria-label="breadcrumb">${crumbs.map(([n, u], i) => (i < crumbs.length - 1 ? `<a href="${u}">${esc(n)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${esc(n)}</span>`)).join("")}</nav>`
    : "";
  return `<!DOCTYPE html>
<html lang="${l === "es" ? "es-SV" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large"}">
<link rel="canonical" href="${abs(canonical)}">
${alt ? `<link rel="alternate" hreflang="en" href="${abs(alt.en)}">
<link rel="alternate" hreflang="es" href="${abs(alt.es)}">
<link rel="alternate" hreflang="x-default" href="${abs(alt.en)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(canonical)}">
<meta property="og:site_name" content="EKY Directory">
<meta property="og:locale" content="${l === "es" ? "es_SV" : "en_US"}">
<meta property="og:image" content="${EKY}/images/everybodyknowsyou_socialshare.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#6200C9">
<link rel="icon" href="/assets/favicon.png">
<link rel="alternate" type="application/json" href="/api/v1/index.json" title="Directory API index">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap">
${map ? `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">` : ""}
<link rel="stylesheet" href="/assets/dir.css">
${(ld || []).map(jsonLd).join("\n")}
</head>
<body>
${PREVIEW ? `<div class="preview">${T[l].previewNote}</div>` : ""}
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="${U.home(l)}"><img src="/assets/eky-logo.png" alt="EverybodyKnowsYou" width="50" height="36"><span><b>${T[l].dir}</b><small>${T[l].by}</small></span></a>
    <nav class="topnav">
      <a href="${U.about(l)}">${T[l].aboutShort}</a>
      <a href="${U.dev(l)}">API · MCP</a>
      ${alt ? `<a class="langsw" href="${alt[altLang]}" hreflang="${altLang}" lang="${altLang}">${T[l].other}</a>` : ""}
    </nav>
  </div>
</header>
<main class="wrap">
${crumbHtml}
${body}
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <p class="cta-line"><span>${T[l].makeFindable}</span> <a class="btn lime" href="${EKY}${l === "es" ? "/es/" : "/"}">${T[l].eky} →</a></p>
    <p>${T[l].notOfficial}</p>
    <p class="flinks"><a href="${U.about(l)}">${T[l].aboutDir}</a> · <a href="${U.dev(l)}">API · MCP</a> · <a href="/data/el-salvador.csv">${T[l].download} (CSV)</a> · <a href="${EKY}">everybodyknowsyou.com</a></p>
  </div>
</footer>
${map ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>` : ""}
<script src="/assets/dir.js" defer></script>
</body>
</html>`;
}

// ------------------------------------------------------------------ JSON-LD
const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "EKY Directory", alternateName: "EverybodyKnowsYou Directory",
      inLanguage: ["en", "es"], publisher: { "@id": `${EKY}/#org` } },
    { "@type": "Organization", "@id": `${EKY}/#org`, name: "EverybodyKnowsYou", alternateName: "EKY", url: `${EKY}/`,
      logo: `${EKY}/images/logo/eky-logo-complete.png` },
  ],
};
const entityId = (c, e) => abs(U.entry("en", c, e)) + "#entity";

function entityLD(c, e, l, byName) {
  const schemaType = e.kind === "person" ? "Person" : TYPES[e.type]?.schema || "Organization";
  const sameAs = [e.website, ...Object.values(e.links || {})].filter(Boolean);
  const o = {
    "@type": schemaType, "@id": entityId(c, e), name: e.name,
    description: tr(e.description, l) || undefined,
    url: e.website || abs(U.entry(l, c, e)),
    sameAs: sameAs.length ? [...new Set(sameAs)] : undefined,
    mainEntityOfPage: abs(U.entry(l, c, e)),
    keywords: (e.tags || []).join(", ") || undefined,
    knowsLanguage: e.languages?.length ? e.languages : undefined,
    subjectOf: e.sources?.filter((s) => s.startsWith("http")).map((s) => ({ "@type": "WebPage", url: s })) || undefined,
  };
  if (e.kind === "person") {
    o.jobTitle = e.role || undefined;
    const works = (e.ventures || []).map((v) => byName.get(v.toLowerCase())).filter(Boolean);
    if (works.length) o.worksFor = works.map((w) => ({ "@id": entityId(c, w) }));
    if (e.location?.city || e.location?.department) o.workLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: e.location.city || undefined, addressRegion: e.location.department || undefined, addressCountry: "SV" } };
  } else {
    const L = e.location || {};
    if (L.address || L.district || L.city || L.department)
      o.address = { "@type": "PostalAddress", streetAddress: L.address || undefined, addressLocality: L.district || L.city || undefined, addressRegion: L.department || undefined, addressCountry: "SV" };
    if (e.geo) { o.geo = { "@type": "GeoCoordinates", latitude: e.geo.lat, longitude: e.geo.lng }; }
    if (e.maps) o.hasMap = e.maps;
    if (e.extra?.priceRange) o.priceRange = e.extra.priceRange;
    if (e.acceptsBitcoin) o.paymentAccepted = "Bitcoin";
    if (e.extra?.foundingYear) o.foundingDate = String(e.extra.foundingYear);
    if (e.extra?.founders?.length) o.founder = e.extra.founders.map((n) => { const p = byName.get(n.toLowerCase()); return p ? { "@id": entityId(c, p) } : { "@type": "Person", name: n }; });
    if (e.extra?.areaServed?.length) o.areaServed = e.extra.areaServed;
    if (e.extra?.hours) o.openingHours = e.extra.hours;
    if (e.extra?.menuUrl) o.hasMenu = e.extra.menuUrl;
    if (e.extra?.reservationsUrl || e.extra?.bookingUrl) o.potentialAction = { "@type": "ReserveAction", target: e.extra.reservationsUrl || e.extra.bookingUrl };
    if (e.profile?.services) {
      const s = tr(e.profile.services, l);
      if (s?.length) o.hasOfferCatalog = { "@type": "OfferCatalog", name: T[l].services, itemListElement: s.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x } })) };
    }
    if (!["Organization", "Brewery"].includes(schemaType)) o.additionalType = undefined;
  }
  return JSON.parse(JSON.stringify(o));
}

function breadcrumbLD(items) {
  return { "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: abs(u) })) };
}

// ------------------------------------------------------------------ components
function linksHtml(e, l) {
  const items = Object.entries(e.links || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" rel="noopener" target="_blank">${LINK_LABEL[k] || k}</a>`);
  return items.length ? items.join(" · ") : `<span class="muted">${T[l].none}</span>`;
}
function siteCell(e, l) {
  if (e.website) return `<a href="${esc(e.website)}" rel="noopener" target="_blank">${esc(hostOf(e.website))}</a>`;
  return `<span class="muted">${e.kind === "person" ? T[l].noPersonal : T[l].noSite}</span>`;
}
function tagChips(e, l) {
  return (e.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
}
function rowData(e) {
  return `data-name="${esc(e.name.toLowerCase())}" data-type="${esc(e.type)}" data-dep="${esc(e.location?.department || "")}" data-tags="${esc((e.tags || []).join("|").toLowerCase())}"`;
}

function orgTable(c, list, l) {
  return `<div class="tablewrap"><table class="dtable" data-filter-table>
<thead><tr><th>${T[l].name}</th><th>${T[l].type}</th><th>${T[l].location}</th><th>${T[l].website}</th><th>${T[l].links}</th></tr></thead>
<tbody>${list.map((e) => `<tr ${rowData(e)}><td data-label="${T[l].name}"><a class="ename" href="${U.entry(l, c, e)}">${esc(e.name)}</a>${e.ekyClient ? ` <span class="badge" title="${esc(T[l].verified)}">✓</span>` : ""}<div class="sub">${esc(tr(e.description, l)).slice(0, 140)}</div></td><td data-label="${T[l].type}">${esc(typeLabel(e.type, l))}</td><td data-label="${T[l].location}">${esc(placeLine(e)) || "<span class='muted'>–</span>"}</td><td data-label="${T[l].website}">${siteCell(e, l)}</td><td data-label="${T[l].links}">${linksHtml(e, l)}</td></tr>`).join("\n")}</tbody>
</table></div>`;
}
function startupTable(c, list, l, byName) {
  return `<div class="tablewrap"><table class="dtable" data-filter-table>
<thead><tr><th>${T[l].name}</th><th>${T[l].sector}</th><th>${T[l].founders}</th><th>${T[l].website}</th><th>LinkedIn</th></tr></thead>
<tbody>${list.map((e) => `<tr ${rowData(e)}><td data-label="${T[l].name}"><a class="ename" href="${U.entry(l, c, e)}">${esc(e.name)}</a><div class="sub">${esc(tr(e.description, l))}</div></td><td data-label="${T[l].sector}">${esc((e.tags || []).join(", "))}</td><td data-label="${T[l].founders}">${(e.extra?.founders || []).map((n) => { const p = byName.get(n.toLowerCase()); return p ? `<a href="${U.entry(l, c, p)}">${esc(n)}</a>` : esc(n); }).join(", ") || "<span class='muted'>–</span>"}</td><td data-label="${T[l].website}">${siteCell(e, l)}</td><td data-label="LinkedIn">${e.links?.linkedin ? `<a href="${esc(e.links.linkedin)}" rel="noopener" target="_blank">LinkedIn</a>` : `<span class="muted">${T[l].none}</span>`}</td></tr>`).join("\n")}</tbody>
</table></div>`;
}
function peopleTable(c, list, l) {
  return `<div class="tablewrap"><table class="dtable" data-filter-table>
<thead><tr><th>${T[l].name}</th><th>${T[l].role}</th><th>LinkedIn</th><th>${T[l].personalSite}</th></tr></thead>
<tbody>${list.map((e) => `<tr ${rowData(e)}><td data-label="${T[l].name}"><a class="ename" href="${U.entry(l, c, e)}">${esc(e.name)}</a></td><td data-label="${T[l].role}">${esc(e.role)}</td><td data-label="LinkedIn">${e.links?.linkedin ? `<a href="${esc(e.links.linkedin)}" rel="noopener" target="_blank">LinkedIn</a>` : `<span class="muted">${T[l].none}</span>`}</td><td data-label="${T[l].personalSite}">${siteCell(e, l)}</td></tr>`).join("\n")}</tbody>
</table></div>`;
}
function filters(list, l, withType = true) {
  const types = [...new Set(list.map((e) => e.type).filter(Boolean))].sort();
  const deps = [...new Set(list.map((e) => e.location?.department).filter(Boolean))].sort();
  return `<form class="filters" role="search" onsubmit="return false">
<input type="search" data-q placeholder="${esc(T[l].search)}" aria-label="${esc(T[l].search)}">
${withType && types.length > 1 ? `<select data-type aria-label="${T[l].type}"><option value="">${T[l].allTypes}</option>${types.map((t) => `<option value="${esc(t)}">${esc(typeLabel(t, l))}</option>`).join("")}</select>` : ""}
${deps.length > 1 ? `<select data-dep aria-label="${T[l].department}"><option value="">${T[l].allDeps}</option>${deps.map((d) => `<option>${esc(d)}</option>`).join("")}</select>` : ""}
</form><p class="noresults" hidden>${T[l].noResults}</p>`;
}
function mapBlock(c, list, l) {
  const pts = list.filter((e) => e.geo).map((e) => ({ n: e.name, u: U.entry(l, c, e), lat: e.geo.lat, lng: e.geo.lng, t: typeLabel(e.type, l) }));
  if (!pts.length) return `<p class="mapnote muted small">${T[l].noMap}</p>`;
  return `<section class="mapsec"><div class="maphead"><h2>${T[l].map}</h2><span class="muted">${T[l].onMap(pts.length)}</span></div>
<div class="map" data-map data-center="${c.center.join(",")}" data-zoom="${c.zoom}"><script type="application/json">${JSON.stringify(pts).replace(/</g, "\\u003c")}</script></div></section>`;
}

// ------------------------------------------------------------------ pages
function buildCountry(c) {
  const entries = loadEntries(c);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]));
  const inCat = (key) => entries.filter((e) => e.category === key || (e.alsoIn || []).includes(key));
  const listCats = CATS.filter((k) => k.slug);
  const catEntries = (cat) => cat.key === "startups" ? [...inCat("startups"), ...inCat("entrepreneurs")] : inCat(cat.key);
  const catIndexable = (cat) => !PREVIEW && catEntries(cat).filter(indexableEntry).length >= MIN_ENTRIES_TO_INDEX_CATEGORY;
  const sitemap = [];

  for (const l of ["en", "es"]) {
    // ---- country hub
    const cards = listCats.map((cat) => {
      const n = catEntries(cat).length;
      return `<a class="card" href="${U.category(l, c, cat)}"><h3>${esc(cat.name[l])}</h3><p>${esc(cat.intro[l])}</p><span class="count">${n ? T[l].entries(n) : T[l].soon}</span></a>`;
    }).join("");
    const crumbs = [[T[l].home, U.home(l)], [c.name[l], U.country(l, c)]];
    const geoAll = entries.filter((e) => e.geo);
    const body = `<section class="hero"><p class="eyebrow">${T[l].dir}</p><h1>${l === "es" ? "Directorio de" : ""} ${esc(c.name[l])}${l === "en" ? " directory" : ""}</h1><p class="lead">${esc(c.intro[l])}</p>
<p class="stats"><b>${entries.filter((e) => e.kind === "organization").length}</b> ${T[l].orgs} · <b>${entries.filter((e) => e.kind === "person").length}</b> ${T[l].people}</p></section>
<section><h2>${T[l].categories}</h2><div class="cards">${cards}</div></section>
${mapBlock(c, geoAll, l)}
<section class="aiblock"><h2>${T[l].forAI}</h2><p>${T[l].forAIText}</p><p><a class="btn" href="${U.dev(l)}">${T[l].seeDev} →</a></p></section>`;
    const ld = [WEBSITE_LD, { "@context": "https://schema.org", "@graph": [
      { "@type": "CollectionPage", "@id": abs(U.country(l, c)) + "#page", url: abs(U.country(l, c)), name: `${c.name[l]} ${T[l].dir}`, inLanguage: l, isPartOf: { "@id": `${SITE}/#website` }, about: { "@type": "Country", name: "El Salvador", identifier: c.iso },
        mainEntity: { "@type": "ItemList", itemListElement: listCats.map((cat, i) => ({ "@type": "ListItem", position: i + 1, name: cat.title[l], url: abs(U.category(l, c, cat)) })) } },
      breadcrumbLD(crumbs) ] }];
    write(U.country(l, c) + "index.html", layout({ l, title: l === "es" ? `Directorio de ${c.name.es}: negocios, colegios, startups y personas` : `${c.name.en} directory: businesses, schools, startups and people`, description: c.intro[l], canonical: U.country(l, c), alt: { en: U.country("en", c), es: U.country("es", c) }, body, ld, map: true, crumbs }));
    sitemap.push({ en: U.country("en", c), es: U.country("es", c), idx: !PREVIEW });

    // ---- category pages
    for (const cat of listCats) {
      const list = catEntries(cat);
      const ccrumbs = [...crumbs, [cat.name[l], U.category(l, c, cat)]];
      let content;
      if (cat.key === "startups") {
        const s = list.filter((e) => e.kind === "organization"), p = list.filter((e) => e.kind === "person");
        content = `${filters(list, l, false)}<h2 id="startups">${T[l].startups} <span class="muted">(${s.length})</span></h2>${startupTable(c, s, l, byName)}<h2 id="people">${T[l].entrepreneurs} <span class="muted">(${p.length})</span></h2>${peopleTable(c, p, l)}`;
      } else if (cat.kind === "person") {
        content = filters(list, l, false) + peopleTable(c, list, l);
      } else {
        content = (cat.map ? mapBlock(c, list, l) : "") + filters(list, l) + orgTable(c, list, l);
      }
      const body = `<section class="hero small"><h1>${esc(cat.title[l])}</h1><p class="lead">${esc(cat.intro[l])}</p><p class="stats">${T[l].entries(list.length)} · ${T[l].updated}: ${BUILD_DATE}</p></section>
${list.length ? content : `<p class="empty">${T[l].empty}</p>`}`;
      const ld = [{ "@context": "https://schema.org", "@graph": [
        { "@type": "CollectionPage", "@id": abs(U.category(l, c, cat)) + "#page", url: abs(U.category(l, c, cat)), name: cat.title[l], description: cat.intro[l], inLanguage: l, isPartOf: { "@id": `${SITE}/#website` }, dateModified: BUILD_DATE,
          mainEntity: { "@type": "ItemList", numberOfItems: list.length, itemListElement: list.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.name, url: abs(U.entry(l, c, e)) })) } },
        breadcrumbLD(ccrumbs) ] }];
      const idx = catIndexable(cat);
      write(U.category(l, c, cat) + "index.html", layout({ l, title: `${cat.title[l]} | ${T[l].dir} EKY`, description: cat.intro[l], canonical: U.category(l, c, cat), alt: { en: U.category("en", c, cat), es: U.category("es", c, cat) }, body, ld, robots: idx ? "index" : "noindex", map: cat.map && cat.key !== "startups", crumbs: ccrumbs }));
      sitemap.push({ en: U.category("en", c, cat), es: U.category("es", c, cat), idx });
    }

    // ---- entry pages
    for (const e of entries) {
      const cat = CAT[e.category];
      const listCat = CAT[cat.listedUnder || cat.key];
      const ecrumbs = [...crumbs, [listCat.name[l], U.category(l, c, listCat)], [e.name, U.entry(l, c, e)]];
      const facts = [];
      const add = (k, v) => { if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) facts.push([k, v]); };
      add(T[l].type, e.kind === "person" ? e.role : typeLabel(e.type, l));
      if (e.kind === "person") { add(T[l].ventures, (e.ventures || []).map((v) => { const o = byName.get(v.toLowerCase()); return o ? `<a href="${U.entry(l, c, o)}">${esc(v)}</a>` : esc(v); }).join(", ")); add(T[l].openTo, esc((e.openTo || []).join(", "))); }
      const L = e.location || {};
      add(T[l].department, esc(L.department)); add(T[l].municipality, esc(L.municipality)); add(T[l].district, esc(L.district));
      add(T[l].city, esc(L.district ? "" : L.city)); add(T[l].address, esc(L.address));
      add(T[l].languages, esc((e.languages || []).join(", ")));
      const x = e.extra || {};
      add(T[l].price, esc(x.priceRange)); add(T[l].hours, esc(x.hours));
      add(T[l].booking, x.bookingUrl ? `<a href="${esc(x.bookingUrl)}" rel="noopener" target="_blank">${esc(hostOf(x.bookingUrl))}</a>` : "");
      add(T[l].menu, x.menuUrl ? `<a href="${esc(x.menuUrl)}" rel="noopener" target="_blank">${esc(hostOf(x.menuUrl))}</a>` : "");
      add(T[l].reservations, x.reservationsUrl ? `<a href="${esc(x.reservationsUrl)}" rel="noopener" target="_blank">${esc(hostOf(x.reservationsUrl))}</a>` : "");
      add(T[l].admissions, x.admissionsUrl ? `<a href="${esc(x.admissionsUrl)}" rel="noopener" target="_blank">${esc(hostOf(x.admissionsUrl))}</a>` : "");
      add(T[l].publicPrivate, esc(x.publicPrivate)); add(T[l].curriculum, esc(x.curriculum)); add(T[l].accreditation, esc(x.accreditation));
      add(T[l].founded, esc(x.foundingYear)); add(T[l].stage, esc(x.stage));
      add(T[l].founders, (x.founders || []).map((n) => { const p = byName.get(n.toLowerCase()); return p ? `<a href="${U.entry(l, c, p)}">${esc(n)}</a>` : esc(n); }).join(", "));
      add(T[l].programs, esc((x.programs || []).join(", "))); add(T[l].hiring, yes(x.hiring, l));
      add(T[l].areaServed, esc((x.areaServed || []).join(", "))); add(T[l].memberships, esc((x.memberships || []).join(", ")));
      add(T[l].zones, esc(x.zonesServed)); add(T[l].foreignBuyers, yes(x.foreignBuyers, l));
      add(T[l].markets, esc((x.marketsServed || []).join(", "))); add(T[l].teamSize, esc(x.teamSize));
      add(T[l].products, esc(x.products)); add(T[l].exports, yes(x.exports, l)); add(T[l].exportMarkets, esc((x.exportMarkets || []).join(", ")));
      add(T[l].certifications, esc((x.certifications || []).join(", "))); add(T[l].rnt, yes(x.rnt, l));
      add(T[l].mainPlatform, esc(x.mainPlatform)); add(T[l].audience, esc(x.audience ? `${x.audience}${x.audienceCheckedOn ? ` (${x.audienceCheckedOn})` : ""}` : ""));
      add(T[l].bitcoin, yes(e.acceptsBitcoin, l));
      add(T[l].alsoIn, (e.alsoIn || []).map((k) => CAT[k]?.slug ? `<a href="${U.category(l, c, CAT[k])}">${esc(CAT[k].name[l])}</a>` : "").join(", "));
      for (const [k, v] of tr(e.profile?.facts, l) || []) add(esc(k), esc(v));

      const P = e.profile || {};
      const services = tr(P.services, l) || [];
      const faq = tr(P.faq, l) || [];
      const desc = tr(e.description, l);
      const descLang = e.description?.[l] ? l : "en";
      const sourcesHtml = (e.sources || []).map((s) => s.startsWith("http") ? `<a href="${esc(s)}" rel="noopener nofollow" target="_blank">${esc(hostOf(s))}</a>` : esc(s)).join(", ");
      const body = `<article class="entry">
<header class="ehead"><p class="eyebrow">${esc(listCat.name[l])}${placeLine(e) ? ` · ${esc(placeLine(e))}` : ""}</p><h1>${esc(e.name)}</h1>
${desc ? `<p class="lead"${descLang !== l ? ` lang="${descLang}"` : ""}>${esc(desc)}</p>` : ""}
<div class="ekeys"><div><span class="k">${e.kind === "person" ? T[l].personalSite : T[l].website}</span>${siteCell(e, l)}</div><div><span class="k">${T[l].links}</span>${linksHtml(e, l)}</div></div>
<p class="chips">${tagChips(e, l)}</p>
<p class="trust ${e.ekyClient ? "ok" : ""}">${e.ekyClient ? "✓ " + T[l].verified : T[l].fromPublic}</p>
</header>
<div class="egrid">
<section class="facts"><h2>${T[l].facts}</h2><dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></section>
${e.geo ? `<section class="emap">${mapBlock(c, [e], l).replace('data-zoom="' + c.zoom + '"', 'data-zoom="14"').replace('data-center="' + c.center.join(",") + '"', `data-center="${e.geo.lat},${e.geo.lng}"`)}${e.maps ? `<p><a href="${esc(e.maps)}" rel="noopener" target="_blank">Google Maps →</a></p>` : ""}</section>` : ""}
</div>
${tr(P.about, l) ? `<section><h2>${T[l].about}</h2><p>${esc(tr(P.about, l))}</p></section>` : ""}
${services.length ? `<section><h2>${T[l].services}</h2><ul class="svc">${services.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>` : ""}
${faq.length ? `<section class="faq"><h2>${T[l].faq}</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>` : ""}
<section class="provenance"><p><b>${T[l].sources}:</b> ${sourcesHtml || "–"}${e.lastChecked ? ` · <b>${T[l].lastChecked}:</b> <time datetime="${esc(e.lastChecked)}">${esc(e.lastChecked)}</time>` : ""}</p>
<p class="claim"><b>${T[l].claim}</b> ${T[l].claimText} <a href="mailto:hey@everybodyknowsyou.com?subject=${encodeURIComponent("Directory: " + e.name)}">${T[l].claimCta}</a></p>
<p class="muted small">JSON: <a href="/api/v1/entries/${e.id}.json">/api/v1/entries/${e.id}.json</a></p></section>
</article>`;
      const ent = entityLD(c, e, l, byName);
      const pageUrl = abs(U.entry(l, c, e));
      const graph = [
        { "@type": "ProfilePage", "@id": pageUrl + "#page", url: pageUrl, name: e.name, inLanguage: l, isPartOf: { "@id": `${SITE}/#website` }, mainEntity: { "@id": ent["@id"] }, dateModified: e.lastChecked || BUILD_DATE },
        ent, breadcrumbLD(ecrumbs),
      ];
      if (faq.length) graph.push({ "@type": "FAQPage", "@id": pageUrl + "#faq", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
      const idx = !PREVIEW && indexableEntry(e);
      const metaDesc = desc || `${e.name}: ${e.kind === "person" ? e.role : typeLabel(e.type, l)}${placeLine(e) ? ", " + placeLine(e) : ""}, El Salvador.`;
      write(U.entry(l, c, e) + "index.html", layout({ l, title: `${e.name}${e.kind === "person" ? (e.role ? ` · ${e.role}` : "") : ` · ${typeLabel(e.type, l)}`} | ${c.name[l]}`, description: metaDesc, canonical: U.entry(l, c, e), alt: { en: U.entry("en", c, e), es: U.entry("es", c, e) }, body, ld: [{ "@context": "https://schema.org", "@graph": graph }], robots: idx ? "index" : "noindex", map: Boolean(e.geo), crumbs: ecrumbs }));
      if (l === "en") sitemap.push({ en: U.entry("en", c, e), es: U.entry("es", c, e), idx, lastmod: e.lastChecked });
    }
  }
  return { entries, sitemap, byId };
}

// ------------------------------------------------------------------ public data projection
function publicEntry(c, e) {
  const cat = CAT[e.category];
  return {
    id: e.id, kind: e.kind, country: c.slug, category: cat.listedUnder ? cat.key : e.category, also_in: e.alsoIn || [],
    name: e.name, type: e.type, tags: e.tags || [], description: e.description,
    ...(e.kind === "person" ? { role: e.role, ventures: e.ventures, open_to: e.openTo } : {}),
    website: e.website || null, links: Object.fromEntries(Object.entries(e.links || {}).filter(([, v]) => v)),
    location: e.location, geo: e.geo || null, maps: e.maps || null, languages: e.languages || [],
    accepts_bitcoin: e.acceptsBitcoin ?? null, details: e.extra || {},
    profile: e.profile ? { about: e.profile.about, services: e.profile.services, facts: e.profile.facts, faq: e.profile.faq } : null,
    verification: e.ekyClient ? "built-with-business" : "public-sources",
    sources: e.sources || [], last_checked: e.lastChecked || null,
    url: { en: abs(U.entry("en", c, e)), es: abs(U.entry("es", c, e)) },
  };
}
const csvEsc = (v) => { const s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

// ------------------------------------------------------------------ static pages: home, about, developers
function staticPages(stats) {
  for (const l of ["en", "es"]) {
    const c = COUNTRIES[0];
    const home = `<section class="hero"><p class="eyebrow">EKY ${T[l].dir}</p><h1>${l === "es" ? "Que todos encuentren a todos." : "Let everybody find everybody."}</h1><p class="lead">${T[l].tagline}</p></section>
<section><h2>${T[l].countries}</h2><div class="cards">${COUNTRIES.map((k) => `<a class="card big" href="${U.country(l, k)}"><span class="pill">${T[l].live}</span><h3>${esc(k.name[l])}</h3><p>${esc(k.intro[l])}</p><span class="count">${T[l].entries(stats[k.slug] || 0)}</span></a>`).join("")}<div class="card ghost"><span class="pill grey">${T[l].soon}</span><h3>${l === "es" ? "Más países" : "More countries"}</h3><p>${l === "es" ? "Guatemala, Honduras, Costa Rica y el resto de la región." : "Guatemala, Honduras, Costa Rica and the rest of the region."}</p></div></div></section>
<section class="aiblock"><h2>${T[l].forAI}</h2><p>${T[l].forAIText}</p><p><a class="btn" href="${U.dev(l)}">${T[l].seeDev} →</a></p></section>`;
    write(U.home(l) + "index.html", layout({ l, title: l === "es" ? "Directorio EKY: negocios, lugares y personas, legibles para la IA" : "EKY Directory: businesses, places and people, readable by AI", description: T[l].tagline, canonical: U.home(l), alt: { en: "/", es: "/es/" }, body: home, ld: [WEBSITE_LD] }));

    const about = l === "en" ? `<section class="hero small"><h1>About this directory</h1><p class="lead">The EKY Directory makes businesses, schools, startups and people in El Salvador easy to find for people, search engines and AI assistants.</p></section>
<section class="prose">
<h2>What is in it</h2><p>Each entry has its own page with facts from public sources: the official website, public profiles, location and what the business does. People get a city only, never an address, coordinates or a personal phone number.</p>
<h2>Where the facts come from</h2><p>Every page shows its sources and the date it was last checked. Profiles of EverybodyKnowsYou clients are built with the business itself and are marked as such. All other entries come from public sources such as official websites, public registries, ecosystem programs and press.</p>
<h2>How entries are ordered</h2><p>Alphabetically. Nobody pays for a better position. If paid placements ever exist, they will be clearly labeled.</p>
<h2>Corrections and removal</h2><p>Write to <a href="mailto:hey@everybodyknowsyou.com">hey@everybodyknowsyou.com</a> to correct, complete or remove an entry. Removals are done on the next update.</p>
<h2>Who runs it</h2><p>EverybodyKnowsYou (EKY), a Salvadoran company that builds websites and data that Google and AI assistants can read. This is an independent project, not a government website.</p>
</section>` : `<section class="hero small"><h1>Acerca de este directorio</h1><p class="lead">El Directorio EKY hace que los negocios, colegios, startups y personas de El Salvador sean fáciles de encontrar para las personas, los buscadores y los asistentes de IA.</p></section>
<section class="prose">
<h2>Qué contiene</h2><p>Cada entrada tiene su propia página con datos de fuentes públicas: el sitio web oficial, perfiles públicos, ubicación y a qué se dedica. De las personas solo se muestra la ciudad, nunca una dirección, coordenadas o un teléfono personal.</p>
<h2>De dónde vienen los datos</h2><p>Cada página muestra sus fuentes y la fecha de su última revisión. Los perfiles de clientes de EverybodyKnowsYou se hacen con el propio negocio y están marcados. Las demás entradas vienen de fuentes públicas como sitios oficiales, registros públicos, programas del ecosistema y prensa.</p>
<h2>Cómo se ordenan</h2><p>Por orden alfabético. Nadie paga por una mejor posición. Si algún día hay espacios pagados, estarán claramente marcados.</p>
<h2>Correcciones y retiro</h2><p>Escribe a <a href="mailto:hey@everybodyknowsyou.com">hey@everybodyknowsyou.com</a> para corregir, completar o quitar una entrada. Los retiros se hacen en la siguiente actualización.</p>
<h2>Quién lo hace</h2><p>EverybodyKnowsYou (EKY), una empresa salvadoreña que crea sitios web y datos que Google y los asistentes de IA pueden leer. Es un proyecto independiente, no un sitio del gobierno.</p>
</section>`;
    write(U.about(l) + "index.html", layout({ l, title: l === "es" ? "Acerca del Directorio EKY" : "About the EKY Directory", description: T[l].tagline, canonical: U.about(l), alt: { en: U.about("en"), es: U.about("es") }, body: about, ld: [WEBSITE_LD], crumbs: [[T[l].home, U.home(l)], [T[l].aboutDir, U.about(l)]] }));

    const devIntro = l === "en"
      ? `<section class="hero small"><h1>API and MCP</h1><p class="lead">Use the directory from code or from an AI assistant. Read access is free and needs no key. Every record carries its sources and the date it was last checked.</p></section>`
      : `<section class="hero small"><h1>API y MCP</h1><p class="lead">Usa el directorio desde código o desde un asistente de IA. La lectura es gratuita y no necesita clave. Cada registro incluye sus fuentes y la fecha de su última revisión.</p></section>`;
    const dev = `${devIntro}
<section class="prose">
<h2>${l === "en" ? "Connect an AI assistant (MCP)" : "Conecta un asistente de IA (MCP)"}</h2>
<p>${l === "en" ? "MCP server URL (Streamable HTTP, no login):" : "URL del servidor MCP (Streamable HTTP, sin login):"}</p>
<pre><code>${SITE}/mcp</code></pre>
<p>${l === "en" ? "In Claude: Settings, Connectors, Add custom connector, paste the URL. In ChatGPT: add it as a connector in developer mode. Then ask, for example:" : "En Claude: Configuración, Conectores, Agregar conector personalizado, pega la URL. En ChatGPT: agrégalo como conector en modo desarrollador. Luego pregunta, por ejemplo:"}</p>
<pre><code>${l === "en" ? "Find an English-speaking surf school in La Libertad, El Salvador." : "Busca una escuela de surf en La Libertad, El Salvador, donde hablen inglés."}</code></pre>
<p>${l === "en" ? "Tools:" : "Herramientas:"} <code>search_directory</code>, <code>get_entry</code>, <code>list_categories</code>.</p>
<h2>REST API</h2>
<table class="dtable plain"><tbody>
<tr><td><code>GET /api/v1/index.json</code></td><td>${l === "en" ? "Countries, categories and counts" : "Países, categorías y conteos"}</td></tr>
<tr><td><code>GET /api/v1/el-salvador/entries.json</code></td><td>${l === "en" ? "All entries for a country" : "Todas las entradas de un país"}</td></tr>
<tr><td><code>GET /api/v1/el-salvador/{category}.json</code></td><td>${l === "en" ? "Entries in one category, e.g. tourism" : "Entradas de una categoría, por ejemplo tourism"}</td></tr>
<tr><td><code>GET /api/v1/entries/{id}.json</code></td><td>${l === "en" ? "One entry" : "Una entrada"}</td></tr>
<tr><td><code>GET /api/v1/search?q=surf&amp;category=tourism&amp;department=La%20Libertad</code></td><td>${l === "en" ? "Search with filters: q, country, category, type, tag, department, limit" : "Búsqueda con filtros: q, country, category, type, tag, department, limit"}</td></tr>
</tbody></table>
<p>OpenAPI: <a href="/openapi.json">/openapi.json</a> · ${T[l].download}: <a href="/data/el-salvador.json">JSON</a>, <a href="/data/el-salvador.csv">CSV</a></p>
<h2>${l === "en" ? "Rules for using the data" : "Reglas para usar los datos"}</h2>
<p>${l === "en" ? "Please cite \"EKY Directory (directory.everybodyknowsyou.com)\" and link to the entry page when you show the data. Respect the last_checked date: facts can change." : "Por favor cita \"Directorio EKY (directory.everybodyknowsyou.com)\" y enlaza la página de la entrada cuando muestres los datos. Toma en cuenta la fecha last_checked: los datos pueden cambiar."}</p>
</section>`;
    write(U.dev(l) + "index.html", layout({ l, title: l === "es" ? "API y MCP del Directorio EKY" : "EKY Directory API and MCP", description: T[l].forAIText, canonical: U.dev(l), alt: { en: U.dev("en"), es: U.dev("es") }, body: dev, ld: [WEBSITE_LD], crumbs: [[T[l].home, U.home(l)], ["API · MCP", U.dev(l)]] }));
  }
  write("404.html", layout({ l: "en", title: "Not found | EKY Directory", description: "Page not found", canonical: "/404", body: `<section class="hero small"><h1>Page not found</h1><p class="lead">Página no encontrada. <a href="/">Directory home</a> · <a href="/es/">Inicio del directorio</a></p></section>`, robots: "noindex" }));
}

// ------------------------------------------------------------------ run
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
copyDir(path.join(ROOT, "static"), DIST);

const stats = {}, sitemap = [], allPublic = {};
for (const c of COUNTRIES) {
  const r = buildCountry(c);
  stats[c.slug] = r.entries.length;
  sitemap.push(...r.sitemap);
  const pub = r.entries.map((e) => publicEntry(c, e));
  allPublic[c.slug] = pub;
  const meta = { source: "EKY Directory (directory.everybodyknowsyou.com)", as_of: BUILD_DATE, license: null, country: c.slug };
  write(`api/v1/${c.slug}/entries.json`, JSON.stringify({ ...meta, count: pub.length, entries: pub }, null, 1));
  write(`data/${c.slug}.json`, JSON.stringify({ ...meta, count: pub.length, entries: pub }, null, 1));
  for (const cat of CATS.filter((k) => k.slug)) {
    const keys = cat.key === "startups" ? ["startups", "entrepreneurs"] : [cat.key];
    const list = pub.filter((e) => keys.includes(e.category) || e.also_in.some((k) => keys.includes(k)));
    write(`api/v1/${c.slug}/${cat.key}.json`, JSON.stringify({ ...meta, category: cat.key, count: list.length, entries: list }, null, 1));
  }
  for (const e of pub) write(`api/v1/entries/${e.id}.json`, JSON.stringify({ ...meta, entry: e }, null, 1));
  const cols = ["id", "kind", "category", "name", "type", "tags", "description_en", "description_es", "role", "website", "linkedin", "instagram", "facebook", "department", "municipality", "district", "city", "latitude", "longitude", "languages", "accepts_bitcoin", "verification", "sources", "last_checked", "url_en"];
  const rows = pub.map((e) => [e.id, e.kind, e.category, e.name, e.type, e.tags, e.description?.en, e.description?.es, e.role, e.website, e.links.linkedin, e.links.instagram, e.links.facebook, e.location?.department, e.location?.municipality, e.location?.district, e.location?.city, e.geo?.lat, e.geo?.lng, e.languages, e.accepts_bitcoin, e.verification, e.sources, e.last_checked, e.url.en].map(csvEsc).join(","));
  write(`data/${c.slug}.csv`, "\ufeff" + [cols.join(","), ...rows].join("\n"));
  // D1 seed (not published): loaded with wrangler d1 execute on deploy
  const sq = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
  const sql = ["DELETE FROM entries;", ...pub.map((e) => `INSERT INTO entries (id,country,kind,category,name,type,department,tags,search_text,json,last_checked) VALUES (${[e.id, e.country, e.kind, e.category, e.name, e.type, e.location?.department, e.tags.join("|"), [e.name, e.type, e.tags.join(" "), e.description?.en, e.description?.es, e.role, e.location?.city, e.location?.district, e.location?.department].filter(Boolean).join(" "), JSON.stringify(e), e.last_checked].map(sq).join(",")});`)];
  fs.mkdirSync(path.join(ROOT, "db"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "db", `seed-${c.slug}.sql`), sql.join("\n") + "\n");
}
write("api/v1/index.json", JSON.stringify({
  source: "EKY Directory (directory.everybodyknowsyou.com)", as_of: BUILD_DATE, build_id: new Date().toISOString(),
  countries: COUNTRIES.map((c) => ({ slug: c.slug, name: c.name, count: stats[c.slug], entries: `${SITE}/api/v1/${c.slug}/entries.json` })),
  categories: CATS.filter((k) => k.slug).map((k) => ({ key: k.key, name: k.name, url_en_path: `/{country}/${k.slug.en}/`, api: `${SITE}/api/v1/{country}/${k.key}.json` })),
  search: `${SITE}/api/v1/search`, mcp: `${SITE}/mcp`, openapi: `${SITE}/openapi.json`,
}, null, 1));
staticPages(stats);

// sitemap, robots, llms.txt, headers, openapi
const smUrls = [{ en: "/", es: "/es/", idx: !PREVIEW }, { en: U.about("en"), es: U.about("es"), idx: !PREVIEW }, { en: U.dev("en"), es: U.dev("es"), idx: !PREVIEW }, ...sitemap].filter((s) => s.idx);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${smUrls.flatMap((s) => ["en", "es"].map((l) => `<url><loc>${abs(s[l])}</loc>${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : `<lastmod>${BUILD_DATE}</lastmod>`}<xhtml:link rel="alternate" hreflang="en" href="${abs(s.en)}"/><xhtml:link rel="alternate" hreflang="es" href="${abs(s.es)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${abs(s.en)}"/></url>`)).join("\n")}
</urlset>`);
write("robots.txt", PREVIEW ? "User-agent: *\nDisallow: /\n" : `# EKY Directory: open to people, search engines and AI assistants.
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
const sv = allPublic["el-salvador"] || [];
write("llms.txt", `# EKY Directory

> Public directory of businesses, schools, startups and people in El Salvador, by EverybodyKnowsYou (EKY). Every entry has its own page (English and Spanish), its sources and the date it was last checked. Independent project, not a government website.

## How to use it
- Browse: ${SITE}/el-salvador/
- One entry as JSON: ${SITE}/api/v1/entries/{id}.json
- Search API: ${SITE}/api/v1/search?q=...&category=...&department=...
- MCP server (Streamable HTTP, no login): ${SITE}/mcp
- OpenAPI: ${SITE}/openapi.json
- Full data: ${SITE}/data/el-salvador.json and ${SITE}/data/el-salvador.csv

## Categories (El Salvador)
${CATS.filter((k) => k.slug).map((k) => `- [${k.title.en}](${abs(U.category("en", COUNTRIES[0], k))}): ${k.intro.en}`).join("\n")}

## Rules
- Cite "EKY Directory (directory.everybodyknowsyou.com)" and link the entry page.
- Facts can change: check last_checked.
- Corrections and removals: hey@everybodyknowsyou.com
`);
write("_headers", `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
${PREVIEW ? "  X-Robots-Tag: noindex, nofollow\n" : ""}
/api/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300
/data/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300
/openapi.json
  Access-Control-Allow-Origin: *
/assets/*
  Cache-Control: public, max-age=86400
`);
write("openapi.json", JSON.stringify({
  openapi: "3.1.0",
  info: { title: "EKY Directory API", version: "1.0.0", description: "Read-only API for the EKY Directory: businesses, schools, startups and people in El Salvador. Every record includes sources and last_checked." },
  servers: [{ url: SITE }],
  paths: {
    "/api/v1/search": { get: { operationId: "searchDirectory", summary: "Search entries", parameters: ["q", "country", "category", "type", "tag", "department"].map((n) => ({ name: n, in: "query", required: false, schema: { type: "string" } })).concat([{ name: "limit", in: "query", required: false, schema: { type: "integer", default: 20, maximum: 100 } }]), responses: { 200: { description: "Matching entries", content: { "application/json": { schema: { type: "object" } } } } } } },
    "/api/v1/entries/{id}.json": { get: { operationId: "getEntry", summary: "Get one entry", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "The entry" }, 404: { description: "Not found" } } } },
    "/api/v1/{country}/{category}.json": { get: { operationId: "listCategory", summary: "List entries in a category", parameters: [{ name: "country", in: "path", required: true, schema: { type: "string", enum: COUNTRIES.map((c) => c.slug) } }, { name: "category", in: "path", required: true, schema: { type: "string", enum: CATS.filter((k) => k.slug).map((k) => k.key) } }], responses: { 200: { description: "Entries" } } } },
  },
}, null, 1));

console.log(`Built ${PREVIEW ? "PREVIEW " : ""}site: ${Object.entries(stats).map(([k, v]) => `${k}=${v}`).join(", ")}; sitemap URLs: ${smUrls.length * 2}`);
