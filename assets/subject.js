/* ==========================================================================
   مكتبة الباك — subject.js
   Reads ?id= from the URL and fills the single subject template from SUBJECTS.
   Unknown ids show a "not found" state instead of silently showing another subject.
   ========================================================================== */
(function(){
  "use strict";
  const { h, t, fmt, renderIcon, safeAccent, safeDriveUrl, isSafeId, store, feature } = window.MB;

  const YT_ICON = '<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>';

  function populate(){
    const subjects = SUBJECTS.filter(s => isSafeId(s.id));
    const id = new URLSearchParams(location.search).get("id");
    const subject = subjects.find(s => s.id === id);

    if(!subject){
      document.title = t("pages.notFoundTitle", document.title);
      document.getElementById("subjectContent").hidden = true;
      document.getElementById("subjectNotFound").hidden = false;
      return;
    }

    const index = subjects.indexOf(subject);
    const prev = subjects[(index - 1 + subjects.length) % subjects.length];
    const next = subjects[(index + 1) % subjects.length];
    const accent = safeAccent(subject.accent);

    document.title = fmt(t("pages.subjectTitle", "{name}"), { name: subject.name });
    const meta = document.querySelector('meta[name="description"]');
    if(meta) meta.setAttribute("content", subject.desc);
    document.body.style.setProperty("--accent", accent);

    document.getElementById("subjectTitle").textContent = subject.name;
    document.getElementById("subjectTagline").textContent = subject.desc;

    const iconEl = document.getElementById("subjectIcon");
    if(renderIcon(iconEl, subject.icon)){
      iconEl.querySelectorAll("*").forEach(shape => shape.setAttribute("pathLength", "1"));
      iconEl.classList.add("is-drawing");   // CSS draws it in; skipped under reduced motion
    }

    const driveBtn = document.getElementById("driveButton");
    const driveUrl = safeDriveUrl(subject.driveUrl);
    if(driveUrl){
      driveBtn.href = driveUrl;
    } else {
      driveBtn.removeAttribute("href");
      driveBtn.setAttribute("aria-disabled", "true");
      driveBtn.classList.add("is-disabled");
      document.getElementById("driveNote").textContent = t("subject.driveUnavailable", "");
    }

    document.getElementById("playlistsList").replaceChildren(...(subject.playlists || [])
      .filter(p => p && p.url)
      .map(p => h("li", { "data-reveal": true },
        h("a", { class: "playlist-card", href: p.url, target: "_blank", rel: "noopener noreferrer" },
          (() => { const icon = svg("0 0 24 24", "playlist-icon"); renderIcon(icon, YT_ICON); return icon; })(),
          h("span", { class: "playlist-info" },
            h("span", { class: "playlist-title", text: p.title }),
            p.desc ? h("span", { class: "playlist-desc", text: p.desc }) : null
          )
        )
      )));

    const setSwitch = (elId, target) => {
      const link = document.getElementById(elId);
      link.href = `subject.html?id=${encodeURIComponent(target.id)}`;
      link.querySelector(".switch-name").textContent = target.name;
      link.style.setProperty("--accent", safeAccent(target.accent));
    };
    setSwitch("prevSubject", prev);
    setSwitch("nextSubject", next);

    if(feature("resume")) store.set("maktabatLastSubject", subject.id);
  }

  document.addEventListener("DOMContentLoaded", () => {
    populate();
    window.MBMotion && window.MBMotion.initReveals();
  });
}());