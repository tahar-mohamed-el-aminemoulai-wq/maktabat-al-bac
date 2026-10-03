/* ==========================================================================
   مكتبة الباك — core.js
   Shared, security-sensitive helpers used by every page:
   - text binding from SITE_TEXT (textContent only, never HTML)
   - validators for ids, accents, Drive links and the feedback endpoint
   - an allowlist SVG sanitizer for subject/section icons
   - safe storage wrappers and the shared header/footer behaviour
   Rule of thumb: visitor- or editor-supplied strings reach the DOM only via
   textContent / setAttribute / .value — never through innerHTML.
   ========================================================================== */
(function(){
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- escaping (kept for any string-built markup; escapes quotes too) ---------- */
  function escapeHTML(value){
    return String(value ?? "").replace(/[&<>"'`]/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;"
    })[ch]);
  }

  /* ---------- tiny DOM builder: attributes via setAttribute, text via textContent ---------- */
  function h(tag, attrs, ...children){
    const el = document.createElement(tag);
    if(attrs){
      for(const [key, val] of Object.entries(attrs)){
        if(val === null || val === undefined || val === false) continue;
        if(key === "class") el.className = val;
        else if(key === "text") el.textContent = String(val);
        else if(/^on/i.test(key)) throw new Error("h(): inline handlers are not allowed");
        else el.setAttribute(key, val === true ? "" : String(val));
      }
    }
    for(const child of children.flat()){
      if(child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  /* ---------- text lookup + formatting ---------- */
  function t(path, fallback = ""){
    const root = typeof SITE_TEXT !== "undefined" ? SITE_TEXT : null;
    const val = String(path).split(".").reduce((obj, key) => (obj && Object.prototype.hasOwnProperty.call(obj, key)) ? obj[key] : undefined, root);
    return (typeof val === "string" || Array.isArray(val)) ? val : fallback;
  }

  function fmt(str, vars = {}){
    return String(str ?? "").replace(/\{(\w+)\}/g, (m, key) =>
      Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m);
  }

  const DEFAULT_VARS = { year: new Date().getFullYear() };
  const TEXT_ATTRS = new Set(["aria-label", "placeholder", "title", "content", "alt"]);

  /* Fill [data-text], [data-text-attr] and [data-text-list] from SITE_TEXT.
     Missing keys leave the HTML fallback untouched. */
  function applyText(root = document, vars = {}){
    const allVars = { ...DEFAULT_VARS, ...vars };

    root.querySelectorAll("[data-text]").forEach(el => {
      const val = t(el.dataset.text, null);
      if(typeof val === "string") el.textContent = fmt(val, allVars);
    });

    root.querySelectorAll("[data-text-attr]").forEach(el => {
      el.dataset.textAttr.split(";").forEach(pair => {
        const [attr, key] = pair.split(":").map(s => s && s.trim());
        if(!attr || !key || !TEXT_ATTRS.has(attr)) return;
        const val = t(key, null);
        if(typeof val === "string") el.setAttribute(attr, fmt(val, allVars));
      });
    });

    root.querySelectorAll("[data-text-list]").forEach(el => {
      const list = t(el.dataset.textList, null);
      if(!Array.isArray(list)) return;
      const tag = /^(p|li|span)$/.test(el.dataset.itemTag || "") ? el.dataset.itemTag : "p";
      el.replaceChildren(...list
        .filter(item => typeof item === "string" && item.trim())
        .map(item => h(tag, { class: el.dataset.itemClass || null, text: fmt(item, allVars) })));
    });
  }

  /* ---------- validators ---------- */
  const isSafeId = id => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,29}$/.test(id);

  const ACCENT_RE = /^(var\(--c-[a-z0-9-]{1,30}\)|#[0-9a-fA-F]{6})$/;
  const isSafeAccent = v => typeof v === "string" && ACCENT_RE.test(v.trim());
  const safeAccent = v => isSafeAccent(v) ? v.trim() : "var(--ink-soft)";

  const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
  function safeDriveUrl(value){
    try{
      const url = new URL(String(value || ""));
      if(url.protocol !== "https:" || !DRIVE_HOSTS.has(url.hostname) || url.username || url.password) return null;
      return url.href;
    } catch{ return null; }
  }

  /* Returns { mode: "local" } | { mode: "remote", url } | { mode: "invalid", reason } */
  function getEndpoint(){
    const raw = (window.SITE_CONFIG && typeof window.SITE_CONFIG.feedbackEndpoint === "string")
      ? window.SITE_CONFIG.feedbackEndpoint.trim() : "";
    if(!raw) return { mode: "local" };
    let url;
    try{ url = new URL(raw); } catch{ return { mode: "invalid", reason: "الرابط ليس عنوانًا صالحًا." }; }
    if(url.protocol !== "https:") return { mode: "invalid", reason: "يجب أن يبدأ الرابط بـ https://" };
    if(url.username || url.password) return { mode: "invalid", reason: "لا تضع اسم مستخدم أو كلمة مرور داخل الرابط." };
    return { mode: "remote", url: url.href };
  }

  /* fetch with a hard timeout and a response-size cap; never sends cookies */
  async function postJSON(url, payload, { timeoutMs = 10000, maxBytes = 2_000_000 } = {}){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try{
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // simple request: no CORS preflight
        body: JSON.stringify(payload),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      if(!res.ok) throw new Error("http_" + res.status);
      const text = await res.text();
      if(text.length > maxBytes) throw new Error("response_too_large");
      return JSON.parse(text);
    } finally{
      clearTimeout(timer);
    }
  }

  /* ---------- SVG icon sanitizer (allowlist) ---------- */
  const SVG_ELEMENTS = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect", "g"]);
  const SVG_ATTRS = new Set([
    "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points",
    "transform", "stroke", "stroke-width", "fill", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "opacity", "fill-rule", "clip-rule"
  ]);
  const SVG_VALUE_RE = /^[\w\s.,#()%+-]{0,2000}$/;
  const SVG_PAINT_RE = /^(none|currentColor|#[0-9a-fA-F]{3,8})$/;

  /* Returns a DocumentFragment of safe SVG nodes, or null if the markup is not well-formed. */
  function sanitizeIcon(markup){
    const source = String(markup ?? "");
    if(source.length > 8000) return null;
    const doc = new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${source}</svg>`, "image/svg+xml");
    if(doc.getElementsByTagName("parsererror").length) return null;

    const frag = document.createDocumentFragment();
    const walk = (src, dest, depth) => {
      if(depth > 4) return;
      for(const node of Array.from(src.childNodes)){
        if(node.nodeType !== 1 || node.namespaceURI !== SVG_NS || !SVG_ELEMENTS.has(node.localName)) continue;
        const el = document.createElementNS(SVG_NS, node.localName);
        for(const attr of Array.from(node.attributes)){
          const name = attr.name.toLowerCase();
          const value = attr.value.trim();
          if(attr.namespaceURI || !SVG_ATTRS.has(name)) continue;
          if(!SVG_VALUE_RE.test(value) || /url\s*\(|javascript|expression/i.test(value)) continue;
          if((name === "fill" || name === "stroke") && !SVG_PAINT_RE.test(value)) continue;
          el.setAttribute(name, value);
        }
        if(node.localName === "g") walk(node, el, depth + 1);
        dest.appendChild(el);
      }
    };
    walk(doc.documentElement, frag, 0);
    return frag;
  }

  function serializeIcon(markup){
    const frag = sanitizeIcon(markup);
    if(!frag) return null;
    const s = new XMLSerializer();
    return Array.from(frag.childNodes).map(n => s.serializeToString(n).replace(/ xmlns="[^"]*"/g, "")).join("");
  }

  function renderIcon(svgEl, markup){
    const frag = sanitizeIcon(markup);
    svgEl.replaceChildren();
    if(frag) svgEl.appendChild(frag);
    return !!frag;
  }

  function svg(viewBox, className){
    const el = document.createElementNS(SVG_NS, "svg");
    el.setAttribute("viewBox", viewBox);
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("focusable", "false");
    if(className) el.setAttribute("class", className);
    return el;
  }

  /* ---------- storage that never throws (private mode, disabled storage, quota) ---------- */
  const store = {
    get(key, fallback = null){
      try{ const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
      catch{ return fallback; }
    },
    set(key, value){
      try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch{ return false; }
    },
    remove(key){ try{ localStorage.removeItem(key); } catch{} }
  };

  const feature = name => !!(typeof SITE_SETTINGS !== "undefined" && SITE_SETTINGS.features && SITE_SETTINGS.features[name]);

  /* ---------- optional feature: copy-a-tip button ---------- */
  function copyButton(text){
    if(!feature("copyTips") || !navigator.clipboard || !window.isSecureContext) return null;
    const btn = h("button", { type: "button", class: "tip-copy", "aria-label": t("features.copyTip", ""), title: t("features.copyTip", "") });
    const icon = svg("0 0 20 20");
    renderIcon(icon, '<rect x="6.5" y="6.5" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M4.5 13V4.8c0-.7.6-1.3 1.3-1.3H12" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>');
    const label = h("span", { class: "tip-copy-done", "aria-live": "polite" });
    btn.append(icon, label);
    let timer;
    btn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(String(text));
        label.textContent = t("features.copied", "");
        btn.classList.add("is-done");
        clearTimeout(timer);
        timer = setTimeout(() => { btn.classList.remove("is-done"); label.textContent = ""; }, 1600);
      } catch{}
    });
    return btn;
  }

  /* ---------- shared header: mobile nav ---------- */
  function initNav(){
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("primaryNav");
    if(!toggle || !nav) return;
    const mobile = window.matchMedia("(max-width: 720px)");

    const setOpen = (open, { focusToggle = false } = {}) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if(!open && focusToggle) toggle.focus();
    };

    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", e => { if(e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => {
      if(e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false, { focusToggle: true });
    });
    document.addEventListener("click", e => {
      if(nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    mobile.addEventListener("change", () => setOpen(false));
  }

  function initFooter(){
    const devLink = document.getElementById("devFooterLink");
    if(devLink) devLink.hidden = !(typeof SITE_SETTINGS !== "undefined" && SITE_SETTINGS.showDevLink);
  }

  window.MB = {
    escapeHTML, h, t, fmt, applyText, svg,
    isSafeId, isSafeAccent, safeAccent, safeDriveUrl, getEndpoint, postJSON,
    sanitizeIcon, serializeIcon, renderIcon, store, feature, copyButton,
    reducedMotion: () => reduceMotionQuery.matches,
    initNav, initFooter
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyText();
    initNav();
    initFooter();
  });
}());
