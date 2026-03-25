export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function addUtmParams(urlObj, utm) {
  const keys = ["utm_source", "utm_medium", "utm_campaign"];
  const values = {
    utm_source: utm.UTM_SOURCE,
    utm_medium: utm.UTM_MEDIUM,
    utm_campaign: utm.UTM_CAMPAIGN,
  };

  for (const k of keys) {
    if (!urlObj.searchParams.get(k) && values[k]) urlObj.searchParams.set(k, values[k]);
  }
  return urlObj;
}

export function scoreMatch(service, q) {
  if (!q) return 0;
  const query = q.toLowerCase().trim();
  if (!query) return 0;

  const hay = [
    service.title,
    service.category,
    service.summary,
    ...(service.tags || []),
  ]
    .filter(Boolean)
    .join(" • ")
    .toLowerCase();

  if (hay.includes(query)) return 3;

  const words = query.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const w of words) if (hay.includes(w)) hits += 1;
  return hits > 0 ? 1 : -1;
}

