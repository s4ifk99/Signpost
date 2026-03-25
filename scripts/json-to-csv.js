/**
 * Regenerate data/services.csv from data/services.json.
 * Run from project root: node scripts/json-to-csv.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const jsonPath = path.join(ROOT, "data", "services.json");
const csvPath = path.join(ROOT, "data", "services.csv");

function escapeCsv(value) {
  if (value == null || value === "") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(service) {
  const contact = service.contact && typeof service.contact === "object" ? service.contact : {};
  const areas = Array.isArray(service.areas) ? service.areas.join("; ") : "";
  const tags = Array.isArray(service.tags) ? service.tags.join("; ") : "";
  return [
    escapeCsv(service.title),
    escapeCsv(service.category),
    escapeCsv(service.summary),
    escapeCsv(areas),
    escapeCsv(tags),
    escapeCsv(service.coverage),
    escapeCsv(contact.phone),
    escapeCsv(contact.email),
    escapeCsv(contact.hours),
    escapeCsv(service.cta),
    escapeCsv(service.url),
    service.affiliate ? "true" : "false",
    service.sponsored ? "true" : "false",
    String(service.priority ?? ""),
  ].join(",");
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const services = Array.isArray(data.services) ? data.services : [];
const header =
  "title,category,summary,areas_of_law,tags,coverage,phone,email,hours,cta,website,affiliate,sponsored,priority";
const body = services.map(row).join("\n");
fs.writeFileSync(csvPath, header + "\n" + body + "\n", "utf8");
console.log("Wrote " + csvPath + " (" + services.length + " rows)");
