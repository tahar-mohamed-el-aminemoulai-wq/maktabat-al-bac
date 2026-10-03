"use strict";

/* Combined tests for assets/core.js (security helpers) and the generated
   content files (assets/data.js, assets/guides/*.js). */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/" });
const { window } = dom;
window.matchMedia = window.matchMedia || ((query) => ({
  matches: false, media: query,
  addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {}
}));
for (const key of ["window", "document", "navigator", "localStorage", "DOMParser", "XMLSerializer", "Node", "CustomEvent", "requestAnimationFrame"]) {
  if (!(key in globalThis)) globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.document = window.document;

window.eval(fs.readFileSync(path.join(ROOT, "assets", "core.js"), "utf8"));
const dataSrc = fs.readFileSync(path.join(ROOT, "assets", "data.js"), "utf8");
window.eval(dataSrc + "\n;window.__CONTENT__ = { SUBJECTS, INFO_SECTIONS, SITE_TEXT, SITE_SETTINGS };");
const MB = window.MB;
const { SUBJECTS, SITE_TEXT, SITE_SETTINGS } = window.__CONTENT__;

assert.ok(MB, "core.js exposes window.MB");

test("isSafeId accepts slugs, rejects traversal/case/empty", () => {
  assert.equal(MB.isSafeId("math"), true);
  assert.equal(MB.isSafeId("nat-sci-2"), true);
  assert.equal(MB.isSafeId(""), false);
  assert.equal(MB.isSafeId("../etc"), false);
  assert.equal(MB.isSafeId("Math"), false);
  assert.equal(MB.isSafeId("a".repeat(31)), false);
  assert.equal(MB.isSafeId(123), false);
});

test("isSafeAccent / safeAccent allow only var(--c-…) or #rrggbb", () => {
  assert.equal(MB.isSafeAccent("var(--c-math)"), true);
  assert.equal(MB.isSafeAccent("#A1b2C3"), true);
  assert.equal(MB.isSafeAccent("red"), false);
  assert.equal(MB.isSafeAccent("url(javascript:1)"), false);
  assert.equal(MB.safeAccent("nope"), "var(--ink-soft)");
});

test("safeDriveUrl allows https Google Drive/Docs only", () => {
  assert.ok(MB.safeDriveUrl("https://drive.google.com/drive/folders/abc"));
  assert.ok(MB.safeDriveUrl("https://docs.google.com/document/d/abc"));
  assert.equal(MB.safeDriveUrl("http://drive.google.com/x"), null);
  assert.equal(MB.safeDriveUrl("https://evil.com/drive.google.com"), null);
  assert.equal(MB.safeDriveUrl("javascript:alert(1)"), null);
  assert.equal(MB.safeDriveUrl("https://user:pw@drive.google.com/x"), null);
});

test("getEndpoint: local when empty, invalid for http/credentials, remote for https", () => {
  window.SITE_CONFIG = { feedbackEndpoint: "" };
  assert.deepEqual(MB.getEndpoint().mode, "local");
  window.SITE_CONFIG = { feedbackEndpoint: "http://example.com/exec" };
  assert.deepEqual(MB.getEndpoint().mode, "invalid");
  window.SITE_CONFIG = { feedbackEndpoint: "https://user:pw@example.com/exec" };
  assert.deepEqual(MB.getEndpoint().mode, "invalid");
  window.SITE_CONFIG = { feedbackEndpoint: "https://script.google.com/macros/s/x/exec" };
  assert.deepEqual(MB.getEndpoint().mode, "remote");
  window.SITE_CONFIG = { feedbackEndpoint: "not a url" };
  assert.deepEqual(MB.getEndpoint().mode, "invalid");
});

test("sanitizeIcon strips scripts/handlers/foreign elements, keeps shape", () => {
  const good = MB.serializeIcon('<path d="M4 6h26" stroke="currentColor"/>');
  assert.ok(good && good.includes('d="M4 6h26"'), "keeps a legit path");

  const evil = MB.serializeIcon('<path d="M0 0" onload="alert(1)"/><script>alert(1)</script>');
  assert.ok(evil === null || (!evil.includes("onload") && !evil.includes("script")), "strips dangerous parts");

  const jsUrl = MB.serializeIcon('<path d="javascript:alert(1)"/>');
  assert.ok(jsUrl === null || !jsUrl.includes("javascript"), "strips javascript: values");

  assert.equal(MB.sanitizeIcon("<<<not xml"), null, "rejects malformed markup");
  const fo = MB.serializeIcon('<foreignObject><div/></foreignObject>');
  assert.ok(fo === null || !fo.includes("foreignObject"), "drops foreignObject");
});

test("h() rejects inline handlers and never puts attrs through HTML", () => {
  assert.throws(() => MB.h("div", { onclick: "x" }), /handlers/);
  const el = MB.h("div", { class: "a", text: "<b>&'</b>" });
  assert.equal(el.textContent, "<b>&'</b>");
  assert.equal(el.innerHTML.includes("<b>"), false);
});

test("store never throws", () => {
  assert.doesNotThrow(() => MB.store.set("k", { a: 1 }));
  assert.deepEqual(MB.store.get("k"), { a: 1 });
  MB.store.remove("k");
  assert.equal(MB.store.get("k"), null);
});

test("data.js exposes subjects, text and settings", () => {
  assert.ok(Array.isArray(SUBJECTS) && SUBJECTS.length > 0, "SUBJECTS non-empty");
  assert.equal(typeof SITE_TEXT, "object", "SITE_TEXT present");
  assert.equal(typeof SITE_SETTINGS, "object", "SITE_SETTINGS present");
});

test("every subject passes the site's own validators", () => {
  for (const s of SUBJECTS) {
    assert.ok(MB.isSafeId(s.id), `subject id invalid: ${JSON.stringify(s.id)}`);
    assert.ok(MB.isSafeAccent(s.accent), `subject ${s.id}: unsafe accent`);
    assert.ok(MB.safeDriveUrl(s.driveUrl), `subject ${s.id}: unsafe driveUrl`);
    assert.ok(MB.serializeIcon(s.icon) !== null, `subject ${s.id}: icon does not sanitize`);
    assert.equal(typeof s.name, "string");
    assert.equal(typeof s.desc, "string");
  }
});

test("subject ids are unique", () => {
  const ids = SUBJECTS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("assets/guides/*.js attach to known subject ids", () => {
  const guidesDir = path.join(ROOT, "assets", "guides");
  const files = fs.readdirSync(guidesDir).filter(f => f.endsWith(".js"));
  assert.ok(files.length > 0, "at least one guide file");
  const known = new Set(SUBJECTS.map(s => s.id));
  for (const file of files) {
    window.eval(fs.readFileSync(path.join(guidesDir, file), "utf8"));
    const id = file.replace(/\.js$/, "");
    assert.ok(known.has(id), `guide file for unknown subject: ${id}`);
    const guides = window.SUBJECT_GUIDES;
    assert.ok(guides && guides[id], `${file} did not set SUBJECT_GUIDES["${id}"]`);
    assert.ok(Array.isArray(guides[id].sections) && guides[id].sections.length > 0, `${id}: needs sections`);
  }
});
