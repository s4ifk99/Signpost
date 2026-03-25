import { AFFILIATE_CONFIG } from "./config.js";
import { addUtmParams, safeUrl, scoreMatch, slugify } from "./utils.js";

const els = {
  categoryList: document.getElementById("categoryList"),
  pageTitle: document.getElementById("pageTitle"),
  resultMeta: document.getElementById("resultMeta"),
  sponsored: document.getElementById("sponsored"),
  results: document.getElementById("results"),
  q: document.getElementById("q"),
  onlyPartners: document.getElementById("onlyPartners"),
  hideNonAffiliateBadges: document.getElementById("hideNonAffiliateBadges"),
  partnerCta: document.getElementById("partnerCta"),
  reportLink: document.getElementById("reportLink"),
  suggestLink: document.getElementById("suggestLink"),
};

function getState() {
  const url = new URL(window.location.href);
  return {
    category: url.searchParams.get("category") || "all",
    q: url.searchParams.get("q") || "",
    partnersOnly: url.searchParams.get("partners") === "1",
    hideBadges: url.searchParams.get("hideBadges") === "1",
  };
}

function setState(next) {
  const url = new URL(window.location.href);
  if (next.category) url.searchParams.set("category", next.category);
  else url.searchParams.delete("category");

  if (typeof next.q === "string" && next.q.trim()) url.searchParams.set("q", next.q.trim());
  else url.searchParams.delete("q");

  if (next.partnersOnly) url.searchParams.set("partners", "1");
  else url.searchParams.delete("partners");

  if (next.hideBadges) url.searchParams.set("hideBadges", "1");
  else url.searchParams.delete("hideBadges");

  history.replaceState(null, "", url.toString());
}

async function loadData() {
  const res = await fetch("./data/services.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load services.json");
  const data = await res.json();
  return normalizeData(data);
}

function normalizeData(data) {
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const services = Array.isArray(data.services) ? data.services : [];

  const catSet = new Set(categories);
  const cleaned = services
    .map((s) => ({
      id: s.id || slugify(`${s.title}-${s.category}`),
      title: String(s.title || "").trim(),
      category: String(s.category || "").trim(),
      summary: String(s.summary || "").trim(),
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
      areas: Array.isArray(s.areas) ? s.areas.map(String) : [],
      coverage: String(s.coverage || "").trim(),
      contact: s && typeof s.contact === "object" && s.contact
        ? {
            phone: String(s.contact.phone || "").trim(),
            email: String(s.contact.email || "").trim(),
            hours: String(s.contact.hours || "").trim(),
          }
        : { phone: "", email: "", hours: "" },
      cta: String(s.cta || "Visit").trim(),
      url: String(s.url || "").trim(),
      affiliate: Boolean(s.affiliate),
      sponsored: Boolean(s.sponsored),
      priority: Number.isFinite(Number(s.priority)) ? Number(s.priority) : 0,
    }))
    .filter((s) => s.title && s.category && s.url);

  for (const s of cleaned) catSet.add(s.category);
  const finalCats = ["all", ...Array.from(catSet).sort((a, b) => a.localeCompare(b))];

  return { categories: finalCats, services: cleaned };
}

function serviceLink(service) {
  const u = safeUrl(service.url);
  if (!u) return service.url;

  if (service.affiliate) addUtmParams(u, AFFILIATE_CONFIG);
  return u.toString();
}

function createCategoryItem(name, count, active) {
  const a = document.createElement("a");
  a.className = `cat${active ? " cat--active" : ""}`;
  a.href = `?category=${encodeURIComponent(name)}`;
  a.dataset.category = name;
  a.innerHTML = `
    <span class="cat__name">${escapeHtml(labelForCategory(name))}</span>
    <span class="cat__count">${count}</span>
  `;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const st = getState();
    setState({ ...st, category: name });
    render();
  });
  return a;
}

function labelForCategory(cat) {
  if (cat === "all") return "All services";
  return cat;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderCard(service, { hideBadges = false } = {}) {
  const div = document.createElement("div");
  div.className = "card";

  const badge = service.affiliate && !hideBadges ? `<span class="badge badge--partner">partner</span>` : "";
  const tagItems = [...(service.areas || []), ...(service.tags || [])].filter(Boolean).slice(0, 8);
  const tags = tagItems.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

  const link = serviceLink(service);
  const hint = service.affiliate ? "Affiliate link (tracking applied)" : "Non-partner resource";

  const phone = service.contact?.phone ? `<a class="btn" href="tel:${escapeHtml(service.contact.phone.replace(/\s+/g, ""))}">Call</a>` : "";
  const email = service.contact?.email ? `<a class="btn" href="mailto:${escapeHtml(service.contact.email)}">Email</a>` : "";
  const contactLineParts = [];
  if (service.coverage) contactLineParts.push(service.coverage);
  if (service.contact?.hours) contactLineParts.push(service.contact.hours);
  const contactLine = contactLineParts.length ? `<span class="hint">${escapeHtml(contactLineParts.join(" · "))}</span>` : "";

  div.innerHTML = `
    <div class="card__top">
      <div>
        <div class="card__title">${escapeHtml(service.title)}</div>
        <div class="card__summary">${escapeHtml(service.summary)}</div>
      </div>
      ${badge}
    </div>
    <div class="card__tags">${tags}</div>
    <div class="card__actions">
      <a class="btn ${service.affiliate ? "btn--primary" : "btn--solid"}" href="${escapeHtml(
        link
      )}" target="_blank" rel="noreferrer">${escapeHtml(service.cta)} <span aria-hidden="true">→</span></a>
      ${phone}
      ${email}
      <span class="hint">${escapeHtml(service.category)} · ${escapeHtml(hint)}</span>
    </div>
    ${contactLine ? `<div class="card__actions">${contactLine}</div>` : ""}
  `;

  return div;
}

function applyFilters(services, state) {
  let list = [...services];

  if (state.category && state.category !== "all") {
    list = list.filter((s) => s.category === state.category);
  }
  if (state.partnersOnly) list = list.filter((s) => s.affiliate);

  if (state.q && state.q.trim()) {
    const q = state.q.trim();
    list = list
      .map((s) => ({ s, score: scoreMatch(s, q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || b.s.priority - a.s.priority)
      .map((x) => x.s);
  }

  // Default ordering: sponsored first in their area, then priority, then alpha.
  list.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
  return list;
}

function splitSponsored(services) {
  const sponsored = services.filter((s) => s.sponsored || (s.affiliate && s.priority >= 90)).slice(0, 6);
  const rest = services.filter((s) => !sponsored.some((x) => x.id === s.id));
  return { sponsored, rest };
}

let DATA = null;

async function render() {
  if (!DATA) DATA = await loadData();

  const state = getState();
  els.q.value = state.q;
  els.onlyPartners.checked = state.partnersOnly;
  els.hideNonAffiliateBadges.checked = state.hideBadges;

  els.partnerCta.href = AFFILIATE_CONFIG.DEFAULT_PARTNER_CTA_URL;
  els.reportLink.href = AFFILIATE_CONFIG.DEFAULT_REPORT_URL;
  els.suggestLink.href = AFFILIATE_CONFIG.DEFAULT_SUGGEST_URL;

  const counts = new Map();
  for (const cat of DATA.categories) counts.set(cat, 0);
  for (const s of DATA.services) counts.set(s.category, (counts.get(s.category) || 0) + 1);
  const allCount = DATA.services.length;

  // Sidebar categories
  els.categoryList.innerHTML = "";
  for (const cat of DATA.categories) {
    const count = cat === "all" ? allCount : counts.get(cat) || 0;
    els.categoryList.appendChild(createCategoryItem(cat, count, cat === state.category));
  }

  // Main lists
  const filtered = applyFilters(DATA.services, state);
  const { sponsored, rest } = splitSponsored(filtered);

  els.pageTitle.textContent = labelForCategory(state.category);
  const metaBits = [];
  metaBits.push(`${filtered.length} result${filtered.length === 1 ? "" : "s"}`);
  if (state.q && state.q.trim()) metaBits.push(`search: "${state.q.trim()}"`);
  if (state.partnersOnly) metaBits.push("partners only");
  els.resultMeta.textContent = metaBits.join(" · ");

  els.sponsored.innerHTML = "";
  if (sponsored.length === 0) {
    els.sponsored.innerHTML = `<div class="empty">No sponsored placements yet. Add a partner listing with <code>priority</code> 90+.</div>`;
  } else {
    for (const s of sponsored) els.sponsored.appendChild(renderCard(s, { hideBadges: state.hideBadges }));
  }

  els.results.innerHTML = "";
  if (rest.length === 0) {
    els.results.innerHTML = `<div class="empty">No listings match. Try another category or search.</div>`;
  } else {
    for (const s of rest) els.results.appendChild(renderCard(s, { hideBadges: state.hideBadges }));
  }
}

function wireEvents() {
  const commit = () => {
    const state = getState();
    setState({
      ...state,
      q: els.q.value,
      partnersOnly: els.onlyPartners.checked,
      hideBadges: els.hideNonAffiliateBadges.checked,
    });
    render();
  };

  let t = null;
  els.q.addEventListener("input", () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(commit, 120);
  });
  els.onlyPartners.addEventListener("change", commit);
  els.hideNonAffiliateBadges.addEventListener("change", commit);
  window.addEventListener("popstate", () => render());
}

wireEvents();
render();

