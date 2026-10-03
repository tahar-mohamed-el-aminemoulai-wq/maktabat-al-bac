#!/usr/bin/env node
/* Dev helpers. Usage:
   node tools/dev.js csp        verify meta CSP == _headers == vercel.json
   node tools/dev.js cachebust  stamp assets with ?v=<package.json version> */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const mode = process.argv[2];

/* ---------------- csp: verify the CSP is consistent everywhere ---------------- */
function checkCsp() {
  const PAGES = ["index.html", "subject.html", "info.html", "dev.html"];
  const failures = [];
  const meta = f => {
    const m = fs.readFileSync(path.join(ROOT, f), "utf8")
      .match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    return m && m[1].trim();
  };
  const stripFA = c => c.replace(/frame-ancestors\s+'none';?\s*/i, "").replace(/\s{2,}/g, " ").trim();
  const csvMap = new Map(); let cur = null;
  for (const raw of fs.readFileSync(path.join(ROOT, "_headers"), "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\/\S*$/.test(line)) { cur = line; continue; }
    const m = line.match(/^(Content-Security-Policy):\s*(.+)$/i);
    if (m && cur) csvMap.set(cur, m[2].trim());
  }
  const vercelMap = new Map();
  for (const e of JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")).headers || []) {
    for (const h of e.headers || []) if (/^content-security-policy$/i.test(h.key)) vercelMap.set(e.source, h.value.trim());
  }
  for (const page of PAGES) {
    const m = meta(page);
    if (!m) { failures.push(`${page}: missing meta CSP`); continue; }
    const csv = csvMap.get("/" + page), v = vercelMap.get("/" + page);
    if (!csv) failures.push(`${page}: missing /${page} in _headers`);
    else if (stripFA(csv) !== m) failures.push(`${page}: meta CSP != _headers CSP`);
    if (!v) failures.push(`${page}: missing /${page} in vercel.json`);
    else if (v !== csv) failures.push(`${page}: vercel.json CSP != _headers CSP`);
  }
  if (csvMap.get("/") && csvMap.get("/index.html") && csvMap.get("/") !== csvMap.get("/index.html"))
    failures.push('_headers: "/" != "/index.html"');
  if (vercelMap.get("/") && vercelMap.get("/index.html") && vercelMap.get("/") !== vercelMap.get("/index.html"))
    failures.push('vercel.json: "/" != "/index.html"');
  if (failures.length) { failures.forEach(f => console.error("FAIL " + f)); process.exit(1); }
  console.log("CSP is consistent across meta tags, _headers and vercel.json.");
}

/* ---------------- cachebust: stamp assets with ?v= ---------------- */
function cachebust() {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) { console.error(`version must be x.y.z, got "${version}"`); process.exit(1); }
  let n = 0;
  for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith(".html"))) {
    const full = path.join(ROOT, f), before = fs.readFileSync(full, "utf8");
    const after = before.replace(/((?:href|src)=")(assets\/[^"?]+)(?:\?v=[^"]*)?(")/g, (m, p, u, q) => (n++, p + u + "?v=" + version + q));
    if (after !== before) fs.writeFileSync(full, after);
  }
  const cssPath = path.join(ROOT, "assets", "style.css");
  const beforeCss = fs.readFileSync(cssPath, "utf8");
  const afterCss = beforeCss.replace(/url\("([^"?:]+)(?:\?v=[^"]*)?"\)/g, (m, u) => (n++, `url("${u}?v=${version}")`));
  if (afterCss !== beforeCss) fs.writeFileSync(cssPath, afterCss);
  console.log(`Stamped ${n} reference(s) with ?v=${version}.`);
}

if (mode === "csp") checkCsp();
else if (mode === "cachebust") cachebust();
else { console.log("Usage: node tools/dev.js <csp|cachebust>"); process.exit(2); }
