/* ==========================================================================
   مكتبة الباك — script.js (الصفحة الرئيسية)
   Subject cards, feedback form, scroll-spy, and the optional
   "resume" and "countdown" features. All text comes from assets/data.js.
   ========================================================================== */
(function(){
  "use strict";
  const { h, t, fmt, svg, renderIcon, safeAccent, isSafeId, store, feature } = window.MB;

  const LIMITS = { name: 60, message: 1000, minMessage: 5 };
  const COOLDOWN_MS = 60_000;
  const MIN_FILL_MS = 2500;       // faster than a human can type a message
  const LOCAL_MAX_ITEMS = 200;

  const validSubjects = () => SUBJECTS.filter(s => isSafeId(s.id));

  /* ---------- subject cards ---------- */
  function renderSubjects(){
    const grid = document.getElementById("subjectsGrid");
    const select = document.getElementById("fbSubject");
    const arrow = () => {
      const icon = svg("0 0 16 16");
      renderIcon(icon, '<path d="M11 5 5 11M5 5h6v6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
      return icon;
    };

    grid.replaceChildren(...validSubjects().map((subject, i) => {
      const icon = svg("0 0 32 32", "subject-icon");
      renderIcon(icon, subject.icon);
      const card = h("a", {
        class: "subject-card",
        href: `subject.html?id=${encodeURIComponent(subject.id)}`,
        "aria-label": fmt(t("home.cardAria", "{name}"), { name: subject.name }),
        "data-reveal": true
      },
        h("span", { class: "subject-index", "aria-hidden": "true", text: String(i + 1).padStart(2, "0") }),
        icon,
        h("span", { class: "subject-name", text: subject.name }),
        h("p", { class: "subject-desc", text: subject.desc }),
        h("span", { class: "subject-link" }, h("span", { text: t("home.cardLink", "") }), arrow())
      );
      card.style.setProperty("--accent", safeAccent(subject.accent));
      return card;
    }));

    select.append(...validSubjects().map(s => h("option", { value: s.id, text: s.name })));
  }

  /* ---------- star rating (with hover preview) ---------- */
  function initRating(){
    const wrap = document.querySelector(".rating");
    const stars = Array.from(document.querySelectorAll(".star"));
    const hidden = document.getElementById("fbRating");
    const paint = value => stars.forEach(star => star.classList.toggle("is-on", Number(star.dataset.value) <= value));

    stars.forEach(star => {
      const n = Number(star.dataset.value);
      star.setAttribute("aria-label", fmt(t("form.starAria", "{n}"), { n }));
      star.addEventListener("click", () => {
        const value = Number(hidden.value) === n ? 0 : n;   // click the same star again to clear
        hidden.value = String(value);
        stars.forEach(s => s.setAttribute("aria-pressed", String(Number(s.dataset.value) <= value && value > 0)));
        paint(value);
      });
      star.addEventListener("pointerenter", () => paint(n));
    });
    wrap.addEventListener("pointerleave", () => paint(Number(hidden.value)));
  }

  function resetRating(){
    document.getElementById("fbRating").value = "0";
    document.querySelectorAll(".star").forEach(s => { s.classList.remove("is-on"); s.setAttribute("aria-pressed", "false"); });
  }

  /* ---------- feedback form ---------- */
  function initFeedbackForm(){
    const form = document.getElementById("feedbackForm");
    const note = document.getElementById("formNote");
    const submitBtn = form.querySelector('button[type="submit"]');
    const loadedAt = Date.now();

    form.elements.name.maxLength = LIMITS.name;
    form.elements.message.maxLength = LIMITS.message;

    const say = (key, isError = false) => {
      note.textContent = t(key, "");
      note.classList.toggle("is-error", isError);
    };

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if(submitBtn.disabled) return;

      // Bot traps (client-side only — the server script repeats these checks):
      // a hidden honeypot field, and a minimum time between page load and submit.
      const honeypot = form.elements.website && form.elements.website.value.trim() !== "";
      if(honeypot || Date.now() - loadedAt < MIN_FILL_MS){
        form.reset(); resetRating(); say("form.success");
        return;
      }

      const name = form.elements.name.value.trim().slice(0, LIMITS.name);
      const email = form.elements.email ? form.elements.email.value.trim().slice(0, LIMITS.email || 254) : "";
      const message = form.elements.message.value.trim().slice(0, LIMITS.message);
      const subjectId = form.elements.subject.value;
      const subject = validSubjects().some(s => s.id === subjectId) ? subjectId : "";
      const rating = Math.min(5, Math.max(0, Math.round(Number(form.elements.rating.value) || 0)));

      if(message.length < LIMITS.minMessage){ say("form.tooShort", true); form.elements.message.focus(); return; }

      const last = Number(store.get("maktabatLastFeedback", 0)) || 0;
      if(Date.now() - last < COOLDOWN_MS){ say("form.cooldown", true); return; }

      const endpoint = window.MB.getEndpoint();
      if(endpoint.mode === "invalid"){ say("form.notConfigured", true); console.warn("feedbackEndpoint:", endpoint.reason); return; }

      const payload = { action: "submit", name, email, subject, rating, message, website: "" };
      submitBtn.disabled = true;
      say("form.sending");

      try{
        if(endpoint.mode === "remote"){
          const data = await window.MB.postJSON(endpoint.url, payload);
          if(!data || data.ok !== true) throw new Error(data && data.error || "rejected");
        } else {
          const saved = store.get("maktabatFeedback", []);
          const list = Array.isArray(saved) ? saved : [];
          list.push({ name, email, subject, rating, message, createdAt: new Date().toISOString() });
          if(!store.set("maktabatFeedback", list.slice(-LOCAL_MAX_ITEMS))) throw new Error("storage");
        }
        store.set("maktabatLastFeedback", Date.now());
        form.reset(); resetRating();
        say("form.success");
      } catch(_err){
        say("form.error", true);
      } finally{
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------- active nav link while scrolling ---------- */
  function initScrollSpy(){
    const links = Array.from(document.querySelectorAll('.primary-nav a[href^="#"]'));
    const sections = links.map(l => document.getElementById(l.getAttribute("href").slice(1))).filter(Boolean);
    if(!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        links.forEach(link => {
          const on = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", on);
          if(on) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => observer.observe(s));
  }

  /* ---------- optional: resume where you left off (stored only in this browser) ---------- */
  function initResume(){
    const slot = document.getElementById("resumeSlot");
    if(!slot || !feature("resume")) return;
    const lastId = store.get("maktabatLastSubject", null);
    const subject = validSubjects().find(s => s.id === lastId);
    if(!subject) return;
    const link = h("a", { class: "resume-link", href: `subject.html?id=${encodeURIComponent(subject.id)}` },
      h("span", { class: "resume-label", text: t("features.resume", "") }),
      h("span", { class: "resume-name", text: subject.name })
    );
    link.style.setProperty("--accent", safeAccent(subject.accent));
    slot.replaceChildren(link);
    slot.hidden = false;
  }

  /* ---------- optional: countdown to the exam ---------- */
  function countdownText(){
    const raw = typeof SITE_SETTINGS !== "undefined" ? SITE_SETTINGS.bacDate : "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw || ""));
    if(!m) return null;
    const exam = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((exam - today) / 86_400_000);
    if(!Number.isFinite(days) || days < 0 || days > 400) return null;
    if(days === 0) return t("features.countdownToday", "");
    if(days === 1) return t("features.countdownOne", "");
    if(days === 2) return t("features.countdownTwo", "");
    return fmt(t(days <= 10 ? "features.countdownFew" : "features.countdownMany", ""), { days });
  }

  function initCountdown(){
    const el = document.getElementById("heroCountdown");
    if(!el || !feature("countdown")) return;
    const text = countdownText();
    if(!text) return;
    el.textContent = text;
    el.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderSubjects();
    initRating();
    initFeedbackForm();
    initScrollSpy();
    initResume();
    initCountdown();
    window.MBMotion && window.MBMotion.initReveals();
  });
}());
