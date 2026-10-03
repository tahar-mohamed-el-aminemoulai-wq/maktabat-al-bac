/* ==========================================================================
   مكتبة الباك — info.js
   Builds the general-tips page from INFO_SECTIONS in assets/data.js.
   ========================================================================== */
(function(){
  "use strict";
  const { h, svg, renderIcon, copyButton } = window.MB;

  const ARROW_PATH = '<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>';

  function arrow(cls){
    const icon = svg("0 0 24 24", "flow-arrow-icon");
    renderIcon(icon, ARROW_PATH);
    return h("span", { class: "flow-arrow " + cls, "aria-hidden": "true" }, icon);
  }

  function renderInfoSections(){
    const container = document.getElementById("infoFlow");
    const byTitle = Object.fromEntries(INFO_SECTIONS.map(s => [s.title, s]));
    const card = (section, cls) => {
      const icon = svg("0 0 30 30", "info-icon");
      renderIcon(icon, section.icon);
      return h("article", { class: "flow-card " + cls, "data-reveal": true },
        icon,
        h("h2", { text: section.title }),
        h("ul", null, (section.tips || [])
          .filter(tip => typeof tip === "string" && tip.trim())
          .map(tip => h("li", null, h("span", { class: "tip-text", text: tip }), copyButton(tip))))
      );
    };
    const row = (titles) => h("div", { class: "flow-row" },
      ...titles.flatMap((t, i) => {
        const el = card(byTitle[t], "flow-card--row");
        return i < titles.length - 1 ? [el, arrow("flow-arrow--right")] : [el];
      })
    );
    container.replaceChildren(
      card(byTitle["قبل أن تبدأ"], "flow-card--full flow-card--before"),
      arrow("flow-arrow--down"),
      row(["تنظيم المراجعة", "يوم الامتحان", "إدارة التوتر والوقت"]),
      arrow("flow-arrow--down"),
      row(["المواد العلمية", "اللغات", "مواد الحفظ"]),
      arrow("flow-arrow--down"),
      card(byTitle["المترشحون الأحرار"], "flow-card--full flow-card--free")
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderInfoSections();
    window.MBMotion && window.MBMotion.initReveals();
  });
}());
