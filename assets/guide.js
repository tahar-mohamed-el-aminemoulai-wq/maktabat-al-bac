/* ==========================================================================
   مكتبة الباك — guide.js
   يعرض دليل الدراسة المفصل للمادة الحالية.
   يُحمَّل ملف assets/guides/<id>.js الخاص بالمادة عند الحاجة فقط،
   بدل تحميل ملف الأدلة الكامل في كل زيارة.
   داخل صفحة المادة: فهرس، شريط تقدم القراءة، أقسام قابلة للطي، ومؤشر القسم الحالي.
   كل النصوص تُضاف عبر textContent — لا يوجد أي innerHTML لمحتوى متغير.
   ========================================================================== */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const AR_DIGITS = n => String(n);

  /* إنشاء عنصر بسرعة: el("p", "class", "نص") */
  function el(tag, className, text){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  function currentSubjectId(){
    const id = new URLSearchParams(window.location.search).get("id") || "";
    return /^[a-z]{2,20}$/.test(id) ? id : "";
  }

  function countWords(guide){
    let text = "";
    guide.sections.forEach(s => s.blocks.forEach(b => {
      text += " " + (b.x || "") + " " + (b.items ? b.items.map(i => typeof i === "string" ? i : "").join(" ") : "");
    }));
    return text.trim().split(/\s+/).length;
  }

  /* ---------- الكتل ---------- */
  function renderFlow(items, className){
    const ol = el("ol", className);
    items.forEach((item, i) => {
      const li = el("li", "guide-flow-step");
      li.style.setProperty("--i", i);
      li.append(el("span", "guide-flow-num", AR_DIGITS(i + 1)), el("span", "guide-flow-text", item));
      ol.append(li);
    });
    return ol;
  }

  function renderScore(block){
    const wrap = el("div", "guide-score");
    block.groups.forEach(group => {
      const col = el("div", "guide-score-group");
      col.append(el("p", "guide-score-label", group.label));
      group.items.forEach(item => {
        const card = el("div", "guide-score-card");
        const pts = el("span", "guide-score-pts");
        pts.append(el("strong", null, AR_DIGITS(item.pts)), el("small", null, item.pts > 2 ? "نقطة" : (item.pts === 2 ? "نقطتان" : "نقطة")));
        const body = el("div", "guide-score-body");
        body.append(el("h5", null, item.name), el("p", null, item.note));
        card.append(pts, body);
        col.append(card);
      });
      wrap.append(col);
    });
    const total = el("div", "guide-score-total");
    const bar = el("div", "guide-score-bar");
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", `${block.total} من 20 نقطة`);
    const fill = el("span");
    fill.style.setProperty("--pct", `${(block.total / 20) * 100}%`);
    bar.append(fill);
    total.append(el("p", null, block.totalText), bar, el("span", "guide-score-of", `${block.total} / 20`));
    wrap.append(total);
    return wrap;
  }

  function renderTemplate(items){
    const card = el("dl", "guide-template");
    items.forEach(label => {
      const row = el("div", "guide-template-row");
      row.append(el("dt", null, label + ":"), el("dd", null, "..."));
      card.append(row);
    });
    return card;
  }

  function renderBlock(b){
    switch(b.t){
      case "p": return el("p", "guide-p", b.x);
      case "h3": {
        const h = el("h3", "guide-h3" + (b.n ? " has-num" : ""));
        if(b.n){ const n = el("span", "guide-h3-num", AR_DIGITS(b.n)); n.setAttribute("aria-hidden", "true"); h.append(n); }
        h.append(el("span", null, b.x));
        return h;
      }
      case "h4": return el("h4", "guide-h4", b.x);
      case "ul": {
        const ul = el("ul", "guide-ul");
        b.items.forEach(item => ul.append(el("li", null, item)));
        return ul;
      }
      case "quote": return el("blockquote", "guide-quote", b.x);
      case "callout": return el("p", "guide-callout", b.x);
      case "warning": return el("p", "guide-warning", b.x);
      case "flow": return renderFlow(b.items, "guide-flow");
      case "steps": return renderFlow(b.items, "guide-steps");
      case "template": return renderTemplate(b.items);
      case "score": return renderScore(b);
      default: return null;
    }
  }

  /* ---------- الصفحة ---------- */
  function renderGuide(guide, subjectName){
    const section = el("section", "guide");
    section.id = "guide";
    section.setAttribute("aria-labelledby", "guideTitle");

    /* شريط تقدم القراءة */
    const progress = el("div", "guide-progress");
    progress.setAttribute("aria-hidden", "true");
    progress.append(el("span"));

    /* الرأس */
    const head = el("header", "guide-head");
    const minutes = Math.max(1, Math.round(countWords(guide) / 180));
    head.append(
      el("p", "guide-kicker", `دليل ${subjectName}`),
      Object.assign(el("h2", "guide-title", guide.title), { id: "guideTitle" }),
      el("p", "guide-meta", `${guide.sections.length} أقسام · قراءة حوالي ${minutes} دقيقة`)
    );

    /* الفهرس */
    const toc = el("nav", "guide-toc");
    toc.setAttribute("aria-label", "فهرس الدليل");
    const tocDetails = el("details", "guide-toc-box");
    tocDetails.open = window.matchMedia("(min-width: 960px)").matches;
    const tocSummary = el("summary", "guide-toc-summary", "الفهرس");
    const tocList = el("ol", "guide-toc-list");
    tocDetails.append(tocSummary, tocList);
    toc.append(tocDetails);

    const body = el("div", "guide-body");
    guide.sections.forEach((s, i) => {
      const art = el("article", "guide-section");
      art.id = s.id;
      art.setAttribute("aria-labelledby", s.id + "-t");
      const h2 = el("h2", "guide-h2");
      h2.id = s.id + "-t";
      const num = el("span", "guide-h2-num", String(i + 1).padStart(2, "0"));
      num.setAttribute("aria-hidden", "true");
      h2.append(num, el("span", null, s.title));
      art.append(h2);
      s.blocks.forEach(b => { const node = renderBlock(b); if(node) art.append(node); });
      body.append(art);

      const li = el("li");
      const a = el("a", null, s.title);
      a.href = "#" + s.id;
      li.append(a);
      tocList.append(li);
    });

    const top = el("a", "guide-top", "العودة إلى أعلى الدليل ↑");
    top.href = "#guide";
    body.append(top);

    const layout = el("div", "guide-layout");
    layout.append(toc, body);
    section.append(progress, head, layout);
    return { section, tocDetails, progress };
  }

  function wireBehaviour({ section, tocDetails, progress }){
    const bar = progress.firstChild;
    const links = [...section.querySelectorAll(".guide-toc-list a")];
    const articles = [...section.querySelectorAll(".guide-section")];

    /* شريط التقدم */
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      bar.style.transform = `scaleX(${p})`;
      progress.classList.toggle("is-active", rect.top < window.innerHeight * 0.3 && rect.bottom > 0);
    };
    const onScroll = () => { if(!ticking){ ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    /* القسم الحالي في الفهرس */
    if("IntersectionObserver" in window){
      const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(!entry.isIntersecting) return;
          links.forEach(a => {
            const on = a.getAttribute("href") === "#" + entry.target.id;
            a.classList.toggle("is-current", on);
            if(on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-35% 0px -60% 0px" });
      articles.forEach(a => spy.observe(a));

      /* ظهور تدريجي للأقسام */
      if(!reduceMotion.matches){
        section.classList.add("guide-animate");
        const reveal = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if(entry.isIntersecting){ entry.target.classList.add("is-in"); reveal.unobserve(entry.target); }
          });
        }, { rootMargin: "0px 0px -8% 0px" });
        section.querySelectorAll(".guide-section, .guide-flow, .guide-steps, .guide-score").forEach(n => reveal.observe(n));
      }
    }

    /* على الهاتف: إغلاق الفهرس بعد اختيار قسم */
    links.forEach(a => a.addEventListener("click", () => {
      if(!window.matchMedia("(min-width: 960px)").matches) tocDetails.open = false;
    }));
  }

  function assetVersion(){
    try{
      const tag = document.querySelector('script[src*="guide.js"]');
      if(tag){
        const v = new URL(tag.src, document.baseURI).searchParams.get("v");
        if(v) return v;
      }
    }catch{}
    return "";
  }

  function loadGuideScript(id){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      const v = assetVersion();
      s.src = "assets/guides/" + encodeURIComponent(id) + ".js" + (v ? "?v=" + encodeURIComponent(v) : "");
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("guide_load_failed"));
      document.head.appendChild(s);
    });
  }

  async function init(){
    if(typeof SUBJECTS === "undefined") return;
    const id = currentSubjectId();
    if(!id || document.getElementById("guide")) return;
    const subject = SUBJECTS.find(s => s.id === id);
    if(!subject) return;

    try{ await loadGuideScript(id); }catch{ return; }
    const guide = window.SUBJECT_GUIDES && window.SUBJECT_GUIDES[id];
    if(!guide || document.getElementById("guide")) return;

    const parts = renderGuide(guide, subject.name);
    const anchor = document.querySelector(".tips-section") || document.getElementById("tipsList")?.closest("section");
    const main = document.querySelector("main") || document.body;
    if(anchor) anchor.insertAdjacentElement("afterend", parts.section);
    else main.append(parts.section);

    /* رابط سريع من البطل إلى الدليل */
    const drive = document.getElementById("driveButton");
    if(drive && !document.getElementById("guideJump")){
      const jump = el("a", "btn btn-ghost guide-jump", "اقرأ دليل الدراسة ↓");
      jump.id = "guideJump";
      jump.href = "#guide";
      drive.insertAdjacentElement("afterend", jump);
    }

    wireBehaviour(parts);
    document.dispatchEvent(new CustomEvent("maktabat:content-ready"));
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}());
