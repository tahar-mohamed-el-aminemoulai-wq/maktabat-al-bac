/* ==========================================================================
   مكتبة الباك — motion.js
   One small motion system, no libraries:
   - page enter: pure CSS fade on <body> (see style.css), so a JS failure can
     never leave the page invisible
   - page leave: one 160ms fade before same-origin navigations, undone on
     bfcache restore (Back/Forward) so the page never comes back blank
   - reveal: IntersectionObserver adds a class; CSS does the short stagger
   Everything is skipped entirely under prefers-reduced-motion.
   Budget: enter 300ms + stagger ≤ 270ms + item 380ms  → under 1s.
   ========================================================================== */
(function(){
  "use strict";
  const root = document.documentElement;
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- leave fade ---------- */
  function isModifiedClick(e){
    return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
  }

  document.addEventListener("click", e => {
    if(e.defaultPrevented || isModifiedClick(e)) return;
    const link = e.target.closest("a[href]");
    if(!link || link.target === "_blank" || link.hasAttribute("download")) return;

    let url;
    try{ url = new URL(link.href, location.href); } catch{ return; }
    if(url.origin !== location.origin || !/^https?:$|^file:$/.test(url.protocol)) return;
    // same document, only the hash changes → let CSS smooth-scroll handle it
    if(url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if(reduce()) return;

    e.preventDefault();
    root.classList.add("is-leaving");
    window.setTimeout(() => { location.href = url.href; }, 160);
  });

  // Back/Forward cache restores the page exactly as we left it (faded out) — undo that.
  window.addEventListener("pageshow", () => root.classList.remove("is-leaving"));

  /* ---------- reveal on scroll ---------- */
  const MAX_STAGGER_STEPS = 6;

  function initReveals(){
    if(reduce() || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        const group = entry.target;
        observer.unobserve(group);
        group.classList.add("is-revealed");
        // hand the elements back to their normal hover transitions afterwards
        window.setTimeout(() => group.classList.remove("reveal-pending", "is-revealed"), 800);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    document.querySelectorAll("[data-reveal-group]").forEach(group => {
      // groups already on screen at load are left alone (no hide-then-show flash)
      if(group.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      const items = group.querySelectorAll("[data-reveal]");
      items.forEach((item, i) => item.style.setProperty("--i", Math.min(i, MAX_STAGGER_STEPS)));
      group.classList.add("reveal-pending");
      observer.observe(group);
    });
  }

  window.MBMotion = { initReveals };
}());
