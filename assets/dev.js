/* ==========================================================================
   مكتبة الباك — dev.js
   Local admin panel: view feedback, edit every piece of site content,
   then download a regenerated assets/data.js.

   Honest security notes:
   - The passphrase gate is a client-side deterrent only. Anyone can read this
     file or flip sessionStorage. That is acceptable ONLY because nothing here
     is secret: editing content just produces a file you upload yourself.
   - Reading remote feedback is protected by the SERVER (apps-script/Code.gs
     checks ADMIN_TOKEN). The token is typed in here, kept in memory only,
     and never stored in site files.
   - Every string shown here goes through textContent / .value — never innerHTML.
   ========================================================================== */
(function(){
  "use strict";
  const MB = window.MB;
  const { h, t, svg } = MB;

  const PASS_SALT = "maktabat-al-bac:v1:";
  const DRAFT_KEY = "maktabatDraft_v1";
  const FEEDBACK_MAX = 500;

  /* ======================================================================
     Labels for the "site text" editor. Unknown keys still appear (by key).
     ====================================================================== */
  const GROUP_LABELS = {
    common: "عام (كل الصفحات)", nav: "قائمة التنقل", pages: "عناوين الصفحات ووصفها لمحركات البحث",
    home: "الصفحة الرئيسية", form: "نموذج الآراء", subject: "صفحة المادة",
    info: "صفحة النصائح العامة", features: "الخصائص الاختيارية"
  };
  const TEXT_LABELS = {
    "common.siteName": ["اسم الموقع", "في الترويسة وتبويب المتصفح."],
    "common.skipLink": ["رابط التخطي", "يظهر فقط لمن يتنقل بلوحة المفاتيح."],
    "common.menuLabel": ["وصف زر القائمة", "لقارئات الشاشة، على الهاتف."],
    "common.navLabel": ["وصف قائمة التنقل", "لقارئات الشاشة."],
    "common.footer": ["نص التذييل", "{year} تُستبدل بالسنة الحالية."],
    "common.footerNote": ["ملاحظة التذييل", "سطر صغير تحت نص التذييل."],
    "common.devLink": ["رابط لوحة الإدارة", "يظهر فقط إن فعّلته من الإعدادات."],
    "nav.home": ["الرئيسية"], "nav.subjects": ["المواد"], "nav.tips": ["نصائح عامة"],
    "nav.feedback": ["رأيك"], "nav.about": ["من نحن"],
    "pages.homeTitle": ["عنوان الصفحة الرئيسية", "في تبويب المتصفح ونتائج البحث."],
    "pages.homeDescription": ["وصف الصفحة الرئيسية", "يظهر تحت العنوان في نتائج البحث."],
    "pages.subjectTitle": ["عنوان صفحة المادة", "{name} = اسم المادة."],
    "pages.infoTitle": ["عنوان صفحة النصائح"], "pages.infoDescription": ["وصف صفحة النصائح"],
    "pages.notFoundTitle": ["عنوان صفحة «مادة غير موجودة»"],
    "home.eyebrow": ["سطر صغير فوق العنوان"],
    "home.heroTitle": ["العنوان الرئيسي", "اضغط Enter لبدء سطر جديد."],
    "home.heroSub": ["النص تحت العنوان"],
    "home.ctaPrimary": ["الزر الرئيسي"], "home.ctaSecondary": ["الزر الثانوي"],
    "home.subjectsTitle": ["عنوان قسم المواد"], "home.subjectsSub": ["وصف قسم المواد"],
    "home.cardLink": ["نص الرابط داخل بطاقة المادة"],
    "home.cardAria": ["وصف البطاقة لقارئات الشاشة", "{name} = اسم المادة."],
    "home.feedbackTitle": ["عنوان قسم الآراء"], "home.feedbackSub": ["وصف قسم الآراء"],
    "home.aboutTitle": ["عنوان «من نحن»"], "home.aboutParagraphs": ["فقرات «من نحن»", "كل عنصر فقرة مستقلة."],
    "form.nameLabel": ["تسمية حقل الاسم"], "form.namePlaceholder": ["نص توضيحي داخل حقل الاسم"],
    "form.subjectLabel": ["تسمية قائمة المادة"], "form.subjectGeneral": ["الخيار «عام»"],
    "form.ratingLabel": ["تسمية التقييم"], "form.starAria": ["وصف كل نجمة", "{n} = رقم النجمة."],
    "form.messageLabel": ["تسمية حقل الرسالة"], "form.messagePlaceholder": ["نص توضيحي داخل حقل الرسالة"],
    "form.submit": ["زر الإرسال"], "form.sending": ["رسالة «جارٍ الإرسال»"], "form.success": ["رسالة النجاح"],
    "form.error": ["رسالة الخطأ"], "form.tooShort": ["رسالة «الرسالة قصيرة»"],
    "form.cooldown": ["رسالة «انتظر قبل إرسال رأي آخر»"], "form.notConfigured": ["رسالة «الخدمة غير مهيأة»"],
    "subject.back": ["رابط العودة"], "subject.driveButton": ["زر فتح المجلد"],
    "subject.driveNote": ["ملاحظة تحت الزر"], "subject.driveUnavailable": ["رسالة «الرابط غير متاح»"],
    "subject.tipsTitle": ["عنوان قسم النصائح"], "subject.switchLabel": ["وصف روابط المواد الأخرى", "لقارئات الشاشة."],
    "subject.prevLabel": ["«المادة السابقة»"], "subject.nextLabel": ["«المادة التالية»"],
    "subject.notFoundTitle": ["عنوان «مادة غير موجودة»"], "subject.notFoundText": ["نص «مادة غير موجودة»"],
    "subject.notFoundLink": ["زر «عرض كل المواد»"],
    "info.back": ["رابط العودة"], "info.eyebrow": ["سطر صغير فوق العنوان"], "info.title": ["العنوان"],
    "info.sub": ["النص تحت العنوان"], "info.closingText": ["سؤال الختام"], "info.closingLink": ["زر الختام"],
    "features.countdownMany": ["العدّاد (11 يومًا فأكثر)", "{days} = عدد الأيام."],
    "features.countdownFew": ["العدّاد (3 إلى 10 أيام)", "{days} = عدد الأيام."],
    "features.countdownTwo": ["العدّاد (يومان)"], "features.countdownOne": ["العدّاد (يوم واحد)"],
    "features.countdownToday": ["العدّاد (يوم الامتحان)"],
    "features.resume": ["«تابع من حيث توقفت»"], "features.copyTip": ["وصف زر النسخ"], "features.copied": ["رسالة «نُسخت»"]
  };
  const FEATURE_INFO = {
    resume: ["«تابع من حيث توقفت»", "يتذكّر آخر مادة فتحها الزائر ويعرض رابطًا إليها تحت أزرار الترويسة. يُحفظ في متصفح الزائر فقط ولا يُرسل لأي مكان."],
    copyTips: ["زر نسخ النصائح", "أيقونة صغيرة بجانب كل نصيحة لنسخها ومشاركتها. تعمل فقط على https."],
    countdown: ["عدّاد البكالوريا", "سطر صغير فوق العنوان الرئيسي بعدد الأيام المتبقية. تذكّر تحديث التاريخ كل سنة، وإلا يختفي تلقائيًا بعد مرور الموعد."]
  };

  /* ======================================================================
     State
     ====================================================================== */
  const clone = v => JSON.parse(JSON.stringify(v));
  const published = () => ({
    subjects: clone(SUBJECTS), info: clone(INFO_SECTIONS),
    text: clone(SITE_TEXT), settings: clone(SITE_SETTINGS)
  });
  const fingerprint = obj => { let x = 0; const s = JSON.stringify(obj); for(let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return String(x); };

  let state = published();
  let saveTimer;
  const PUBLISHED_FP = fingerprint(published());

  function setStatus(msg, kind = "ok"){
    const el = document.getElementById("devStatus");
    el.textContent = msg;
    el.dataset.kind = kind;
  }

  function saveDraft(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = MB.store.set(DRAFT_KEY, { base: PUBLISHED_FP, savedAt: Date.now(), state });
      setStatus(ok ? "المسودة محفوظة في هذا المتصفح." : "تعذّر حفظ المسودة (مساحة المتصفح ممتلئة أو معطّلة).", ok ? "ok" : "warn");
    }, 400);
  }

  function loadDraft(){
    const draft = MB.store.get(DRAFT_KEY, null);
    if(!draft || !draft.state || !Array.isArray(draft.state.subjects)) return;
    state = { ...published(), ...draft.state };
    const when = new Date(draft.savedAt).toLocaleString("ar-DZ");
    setStatus(draft.base === PUBLISHED_FP
      ? `تمت استعادة مسودتك (${when}).`
      : `تمت استعادة مسودة (${when}) — تنبيه: ملف data.js المنشور تغيّر منذ حفظها.`, draft.base === PUBLISHED_FP ? "ok" : "warn");
  }

  /* ======================================================================
     Lock (deterrent only)
     ====================================================================== */
  async function sha256hex(text){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }

  function initLock(onUnlock){
    const form = document.getElementById("devLockForm");
    const input = document.getElementById("devPassInput");
    const error = document.getElementById("devLockError");
    const lockBtn = document.getElementById("lockBtn");
    let failures = 0, busy = false, unlocked = false;

    const unlock = () => {
      document.getElementById("devLock").hidden = true;
      document.getElementById("devShell").hidden = false;
      lockBtn.hidden = false;
      try{ sessionStorage.setItem("devUnlocked", "1"); } catch{}
      if(!unlocked){ unlocked = true; onUnlock(); }
    };

    try{ if(sessionStorage.getItem("devUnlocked") === "1"){ unlock(); return; } } catch{}
    input.focus();

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if(busy) return;
      if(!window.crypto || !crypto.subtle){
        error.textContent = "افتح اللوحة عبر https أو localhost أو كملف محلي.";
        return;
      }
      busy = true;
      const expected = String(window.SITE_CONFIG && window.SITE_CONFIG.devPassHash || "");
      const got = await sha256hex(PASS_SALT + input.value);
      if(expected && got === expected){
        error.textContent = "";
        input.value = "";
        busy = false;
        unlock();
      } else {
        failures++;
        error.textContent = "رمز غير صحيح، حاول مجددًا.";
        input.value = "";
        setTimeout(() => { busy = false; input.focus(); }, Math.min(500 * failures, 5000));
      }
    });

    lockBtn.addEventListener("click", () => {
      try{ sessionStorage.removeItem("devUnlocked"); } catch{}
      location.reload();
    });
  }

  /* ======================================================================
     Tabs (ARIA tabs, arrow keys respect RTL)
     ====================================================================== */
  function initTabs(){
    const tabs = Array.from(document.querySelectorAll(".dev-tab"));
    const select = tab => {
      tabs.forEach(tb => {
        const on = tb === tab;
        tb.classList.toggle("is-active", on);
        tb.setAttribute("aria-selected", String(on));
        tb.tabIndex = on ? 0 : -1;
        document.getElementById(tb.getAttribute("aria-controls")).hidden = !on;
      });
      document.getElementById("devActions").hidden = tab.id === "tab-feedback";
      try{ sessionStorage.setItem("devTab", tab.id); } catch{}
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", e => {
        const dir = { ArrowLeft: 1, ArrowRight: -1 }[e.key];   // RTL: left = next
        if(dir === undefined && e.key !== "Home" && e.key !== "End") return;
        e.preventDefault();
        const next = e.key === "Home" ? tabs[0] : e.key === "End" ? tabs[tabs.length - 1] : tabs[(i + dir + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
    let saved = null;
    try{ saved = sessionStorage.getItem("devTab"); } catch{}
    select(tabs.find(tb => tb.id === saved) || tabs[0]);
  }

  /* ======================================================================
     Feedback viewer
     ====================================================================== */
  const str = (v, max) => String(v ?? "").slice(0, max);

  function normalizeFeedback(raw){
    if(!Array.isArray(raw)) return [];
    return raw.slice(-FEEDBACK_MAX).filter(x => x && typeof x === "object").map(x => {
      const d = new Date(x.createdAt);
      return {
        name: str(x.name, 60).trim(),
        subject: str(x.subject, 30),
        rating: Math.min(5, Math.max(0, Math.round(Number(x.rating) || 0))),
        message: str(x.message, 2000),
        createdAt: isNaN(d) ? null : d
      };
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  const subjectName = id => (SUBJECTS.find(s => s.id === id) || {}).name || "عام";

  function renderFeedback(items){
    const list = document.getElementById("feedbackList");
    if(!items.length){ list.replaceChildren(h("p", { class: "empty-state", text: "لا توجد آراء بعد." })); return; }
    const rated = items.filter(i => i.rating > 0);
    const avg = rated.length ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1) : "—";
    list.replaceChildren(
      h("p", { class: "feedback-summary", text: `${items.length} رأي · متوسط التقييم ${avg}` }),
      ...items.map(item => h("article", { class: "feedback-item" },
        h("div", { class: "feedback-item-head" },
          h("strong", { text: item.name || "زائر" }),
          h("span", { class: "feedback-meta" },
            h("span", { text: subjectName(item.subject) }),
            item.rating ? h("span", { class: "feedback-stars", "aria-label": `${item.rating} من 5`, text: "★".repeat(item.rating) }) : null)
        ),
        h("p", { text: item.message }),
        item.createdAt ? h("time", { datetime: item.createdAt.toISOString(), text: item.createdAt.toLocaleString("ar-DZ") }) : null
      ))
    );
  }

  let adminToken = "";   // memory only

  async function loadFeedback(){
    const status = document.getElementById("adminStatus");
    const endpoint = MB.getEndpoint();
    const tokenWrap = document.getElementById("tokenWrap");
    const clearBtn = document.getElementById("clearLocalFeedback");
    tokenWrap.hidden = endpoint.mode !== "remote";
    clearBtn.hidden = endpoint.mode !== "local";

    if(endpoint.mode === "invalid"){
      status.textContent = `رابط الخدمة في site-config.js غير صالح: ${endpoint.reason}`;
      renderFeedback([]);
      return;
    }
    if(endpoint.mode === "local"){
      renderFeedback(normalizeFeedback(MB.store.get("maktabatFeedback", [])));
      status.textContent = "وضع المعاينة المحلي: تظهر فقط الآراء المُرسلة من هذا المتصفح. لتلقي آراء كل الزوار، اربط خدمة في assets/site-config.js.";
      return;
    }

    adminToken = document.getElementById("adminToken").value.trim() || adminToken;
    if(!adminToken){ status.textContent = "أدخل رمز الخدمة (ADMIN_TOKEN) لعرض الآراء."; renderFeedback([]); return; }
    status.textContent = "جارٍ تحميل الآراء…";
    try{
      const data = await MB.postJSON(endpoint.url, { action: "list", token: adminToken }, { timeoutMs: 15000 });
      if(!data || data.ok !== true){
        status.textContent = data && data.error === "unauthorized" ? "رمز الخدمة غير صحيح." : "رفضت الخدمة الطلب.";
        renderFeedback([]);
        return;
      }
      const items = normalizeFeedback(data.items);
      renderFeedback(items);
      status.textContent = `تم تحميل ${items.length} رأي.`;
    } catch(err){
      status.textContent = err && err.name === "AbortError"
        ? "انتهت مهلة الاتصال بالخدمة."
        : "تعذّر تحميل الآراء. تحقق من رابط الخدمة، وأنه مسموح في Content-Security-Policy.";
      renderFeedback([]);
    }
  }

  function initFeedbackTab(){
    document.getElementById("refreshFeedback").addEventListener("click", loadFeedback);
    document.getElementById("adminToken").addEventListener("keydown", e => { if(e.key === "Enter") loadFeedback(); });
    document.getElementById("clearLocalFeedback").addEventListener("click", () => {
      if(!confirm("حذف كل الآراء المحفوظة محليًا في هذا المتصفح؟")) return;
      MB.store.remove("maktabatFeedback");
      loadFeedback();
    });
    loadFeedback();
  }

  /* ======================================================================
     Small form-building helpers (all values via .value / textContent)
     ====================================================================== */
  let uid = 0;
  const nextId = () => `f${++uid}`;

  function field({ label, hint, value, multiline, rows = 2, dir, onInput, validate, type = "text" }){
    const id = nextId();
    const input = multiline ? h("textarea", { id, rows }) : h("input", { id, type });
    if(dir) input.setAttribute("dir", dir);
    input.value = value ?? "";
    const msg = h("p", { class: "dev-field-msg", "aria-live": "polite" });
    const check = () => {
      const problem = validate ? validate(input.value) : "";
      msg.textContent = problem || "";
      input.classList.toggle("is-invalid", !!problem);
      input.setAttribute("aria-invalid", String(!!problem));
    };
    input.addEventListener("input", () => { onInput(input.value); check(); saveDraft(); });
    check();
    return h("div", { class: "dev-field" },
      h("label", { for: id, text: label }),
      hint ? h("p", { class: "dev-field-hint", text: hint }) : null,
      input, msg);
  }

  function listEditor(arr, { addLabel = "+ إضافة نصيحة", itemLabel = "نصيحة" } = {}){
    const wrap = h("div", { class: "dev-tips" });
    const add = h("button", { type: "button", class: "dev-add-tip", text: addLabel });
    const render = () => {
      wrap.replaceChildren(...arr.map((item, i) => {
        const ta = h("textarea", { rows: 2, "aria-label": `${itemLabel} ${i + 1}` });
        ta.value = item;
        ta.addEventListener("input", () => { arr[i] = ta.value; saveDraft(); });
        const up = h("button", { type: "button", class: "dev-icon-btn", "aria-label": "تقديم", title: "تقديم", text: "↑", disabled: i === 0 });
        const del = h("button", { type: "button", class: "dev-icon-btn dev-tip-remove", "aria-label": `حذف ${itemLabel} ${i + 1}`, title: "حذف", text: "×" });
        up.addEventListener("click", () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; render(); saveDraft(); });
        del.addEventListener("click", () => { arr.splice(i, 1); render(); saveDraft(); });
        return h("div", { class: "dev-tip-row" }, ta, h("div", { class: "dev-tip-tools" }, up, del));
      }));
    };
    add.addEventListener("click", () => { arr.push(""); render(); saveDraft(); wrap.lastElementChild?.querySelector("textarea")?.focus(); });
    render();
    return h("div", null, wrap, add);
  }

  function playlistsEditor(arr){
    if(!Array.isArray(arr)) arr = [];
    const wrap = h("div", { class: "dev-tips" });
    const add = h("button", { type: "button", class: "dev-add-tip", text: "+ إضافة قائمة" });
    const render = () => {
      wrap.replaceChildren(...arr.map((item, i) => {
        const titleInput = h("input", { type: "text", "aria-label": `عنوان القائمة ${i + 1}`, placeholder: "عنوان القائمة" });
        titleInput.value = item.title || "";
        titleInput.addEventListener("input", () => { item.title = titleInput.value; saveDraft(); });
        const urlInput = h("input", { type: "url", "aria-label": `رابط يوتيوب ${i + 1}`, placeholder: "https://www.youtube.com/playlist?list=...", dir: "ltr" });
        urlInput.value = item.url || "";
        urlInput.addEventListener("input", () => { item.url = urlInput.value; saveDraft(); });
        const descInput = h("input", { type: "text", "aria-label": `وصف القائمة ${i + 1}`, placeholder: "وصف قصير (اختياري)" });
        descInput.value = item.desc || "";
        descInput.addEventListener("input", () => { item.desc = descInput.value; saveDraft(); });
        const up = h("button", { type: "button", class: "dev-icon-btn", "aria-label": "تقديم", title: "تقديم", text: "↑", disabled: i === 0 });
        const del = h("button", { type: "button", class: "dev-icon-btn dev-tip-remove", "aria-label": `حذف القائمة ${i + 1}`, title: "حذف", text: "×" });
        up.addEventListener("click", () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; render(); saveDraft(); });
        del.addEventListener("click", () => { arr.splice(i, 1); render(); saveDraft(); });
        return h("div", { class: "dev-playlist-row" },
          h("div", { class: "dev-playlist-fields" }, titleInput, urlInput, descInput),
          h("div", { class: "dev-tip-tools" }, up, del)
        );
      }));
    };
    add.addEventListener("click", () => { arr.push({ title: "", url: "", desc: "" }); render(); saveDraft(); wrap.lastElementChild?.querySelector("input")?.focus(); });
    render();
    return h("div", null, wrap, add);
  }

  function iconField(obj){
    const preview = svg("0 0 32 32", "dev-icon-preview");
    const refresh = () => {
      const ok = MB.renderIcon(preview, obj.icon);
      return ok ? "" : "SVG غير صالح — تأكد من إغلاق كل الوسوم.";
    };
    refresh();
    const f = field({
      label: "أيقونة SVG", hint: "عناصر مسموحة فقط: path وcircle وellipse وline وpolyline وpolygon وrect وg. أي شيء آخر يُحذف تلقائيًا.",
      value: obj.icon, multiline: true, rows: 5, dir: "ltr",
      onInput: v => { obj.icon = v; }, validate: () => refresh()
    });
    f.querySelector("textarea").classList.add("dev-code");
    return h("details", { class: "dev-advanced-inline" },
      h("summary", null, preview, h("span", { text: "الأيقونة (للمستخدمين المتقدمين)" })), f);
  }

  function resolveColor(accent){
    const probe = h("span");
    probe.style.color = MB.safeAccent(accent);
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color.match(/\d+/g) || [0, 0, 0];
    probe.remove();
    return "#" + rgb.slice(0, 3).map(n => Number(n).toString(16).padStart(2, "0")).join("");
  }

  function cardTools(list, index, rerender, what){
    const up = h("button", { type: "button", class: "dev-icon-btn", "aria-label": `تقديم ${what}`, title: "تقديم", text: "↑", disabled: index === 0 });
    const down = h("button", { type: "button", class: "dev-icon-btn", "aria-label": `تأخير ${what}`, title: "تأخير", text: "↓", disabled: index === list.length - 1 });
    const del = h("button", { type: "button", class: "dev-icon-btn dev-tip-remove", "aria-label": `حذف ${what}`, title: "حذف", text: "×" });
    up.addEventListener("click", () => { [list[index - 1], list[index]] = [list[index], list[index - 1]]; rerender(); saveDraft(); });
    down.addEventListener("click", () => { [list[index + 1], list[index]] = [list[index], list[index + 1]]; rerender(); saveDraft(); });
    del.addEventListener("click", () => { if(!confirm(`حذف ${what} نهائيًا من المسودة؟`)) return; list.splice(index, 1); rerender(); saveDraft(); });
    return h("div", { class: "dev-card-tools" }, up, down, del);
  }

  /* ======================================================================
     Subjects editor
     ====================================================================== */
  function renderSubjects(){
    const root = document.getElementById("subjectsEditor");
    root.replaceChildren(...state.subjects.map((s, i) => buildSubjectCard(s, i)));
  }

  function buildSubjectCard(subject, index){
    if(!Array.isArray(subject.tips)) subject.tips = [];
    const title = h("h3", { text: subject.name || "مادة جديدة" });
    const idBadge = h("span", { class: "dev-badge", dir: "ltr", text: `#${subject.id}` });

    const color = h("input", { type: "color", id: nextId(), "aria-label": "لون المادة" });
    color.value = resolveColor(subject.accent);
    const colorText = h("code", { dir: "ltr", text: subject.accent });
    color.addEventListener("input", () => { subject.accent = color.value; colorText.textContent = color.value; card.style.setProperty("--accent", color.value); saveDraft(); });

    const card = h("article", { class: "dev-card" },
      h("div", { class: "dev-card-head" }, h("div", { class: "dev-card-title" }, title, idBadge), cardTools(state.subjects, index, renderSubjects, `مادة «${subject.name || subject.id}»`)),
      field({ label: "اسم المادة", hint: "في بطاقة المادة بالصفحة الرئيسية وعنوان صفحتها.", value: subject.name,
        onInput: v => { subject.name = v; title.textContent = v || "مادة جديدة"; }, validate: v => v.trim() ? "" : "الاسم مطلوب." }),
      field({ label: "وصف قصير", hint: "جملة واحدة تظهر تحت اسم المادة.", value: subject.desc, multiline: true, onInput: v => { subject.desc = v; } }),
      field({ label: "رابط مجلد Drive", hint: "يجب أن يبدأ بـ https://drive.google.com — واجعل المشاركة «أي شخص لديه الرابط».", value: subject.driveUrl, dir: "ltr", type: "url",
        onInput: v => { subject.driveUrl = v.trim(); }, validate: v => MB.safeDriveUrl(v.trim()) ? "" : "رابط غير صالح: يُقبل فقط رابط https من drive.google.com أو docs.google.com." }),
      field({ label: "المعرّف في الرابط (id)", hint: "حروف لاتينية صغيرة وأرقام وشرطة فقط. تغييره يكسر الروابط القديمة لهذه المادة.", value: subject.id, dir: "ltr",
        onInput: v => { subject.id = v.trim(); idBadge.textContent = `#${subject.id}`; },
        validate: v => !MB.isSafeId(v.trim()) ? "معرّف غير صالح (مثال: math أو arabic-lit)." : state.subjects.filter(s => s.id === v.trim()).length > 1 ? "هذا المعرّف مستعمل لمادة أخرى." : "" }),
      h("div", { class: "dev-field dev-color-field" },
        h("label", { for: color.id, text: "لون المادة" }),
        h("p", { class: "dev-field-hint", text: "يظهر فقط عند التمرير والتفاعل. اختر لونًا طبيعيًا هادئًا." }),
        h("div", { class: "dev-color-row" }, color, colorText)),
      h("div", { class: "dev-field" }, h("span", { class: "dev-label", text: "قوائم يوتيوب" }),
        h("p", { class: "dev-field-hint", text: "تظهر في صفحة المادة كروابط مع أيقونة يوتيوب." }), playlistsEditor(subject.playlists)),
      iconField(subject)
    );
    card.style.setProperty("--accent", MB.safeAccent(subject.accent));
    return card;
  }

  /* ======================================================================
     Info sections editor
     ====================================================================== */
  function renderInfo(){
    const root = document.getElementById("infoEditor");
    root.replaceChildren(...state.info.map((sec, i) => {
      if(!Array.isArray(sec.tips)) sec.tips = [];
      const title = h("h3", { text: sec.title || "محور جديد" });
      return h("article", { class: "dev-card" },
        h("div", { class: "dev-card-head" }, h("div", { class: "dev-card-title" }, title), cardTools(state.info, i, renderInfo, `محور «${sec.title || i + 1}»`)),
        field({ label: "عنوان المحور", value: sec.title, onInput: v => { sec.title = v; title.textContent = v || "محور جديد"; }, validate: v => v.trim() ? "" : "العنوان مطلوب." }),
        h("div", { class: "dev-field" }, h("span", { class: "dev-label", text: "النصائح" }), listEditor(sec.tips)),
        iconField(sec)
      );
    }));
  }

  /* ======================================================================
     Site text editor (generated from SITE_TEXT itself)
     ====================================================================== */
  const tokensOf = s => (String(s).match(/\{\w+\}/g) || []);

  function renderText(){
    const root = document.getElementById("textEditor");
    const original = SITE_TEXT;
    root.replaceChildren(...Object.keys(state.text).map(group => {
      const values = state.text[group];
      if(!values || typeof values !== "object") return null;
      const fields = Object.keys(values).map(key => {
        const path = `${group}.${key}`;
        const [label, hint] = TEXT_LABELS[path] || [key];
        let node;
        if(Array.isArray(values[key])){
          node = h("div", { class: "dev-field" }, h("span", { class: "dev-label", text: label }),
            hint ? h("p", { class: "dev-field-hint", text: hint }) : null,
            listEditor(values[key], { addLabel: "+ إضافة فقرة", itemLabel: "فقرة" }));
        } else {
          const orig = original[group] && typeof original[group][key] === "string" ? original[group][key] : "";
          const needed = tokensOf(orig);
          const v = String(values[key] ?? "");
          node = field({
            label, hint, value: v,
            multiline: v.length > 70 || v.includes("\n") || key === "heroTitle",
            rows: key === "heroTitle" ? 2 : 3,
            onInput: val => { values[key] = val; },
            validate: val => {
              const missing = needed.filter(tok => !val.includes(tok));
              return missing.length ? `تنبيه: هذا النص كان يحتوي على ${missing.join(" و")} — بدونه لن يظهر الاسم/الرقم.` : "";
            }
          });
        }
        node.dataset.search = `${label} ${hint || ""} ${path} ${JSON.stringify(values[key])}`.toLowerCase();
        node.append(h("code", { class: "dev-key", dir: "ltr", text: path }));
        return node;
      });
      return h("section", { class: "dev-card dev-text-group" }, h("h3", { text: GROUP_LABELS[group] || group }), ...fields);
    }));
  }

  function initTextSearch(){
    const input = document.getElementById("textSearch");
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll(".dev-text-group").forEach(group => {
        let any = false;
        group.querySelectorAll(":scope > .dev-field").forEach(f => {
          const show = !q || (f.dataset.search || "").includes(q);
          f.hidden = !show; any = any || show;
        });
        group.hidden = !any;
      });
    });
  }

  /* ======================================================================
     Settings editor
     ====================================================================== */
  function renderSettings(){
    const root = document.getElementById("settingsEditor");
    const s = state.settings;
    s.features = s.features || {};
    const rows = Object.keys(FEATURE_INFO).map(key => {
      const id = nextId();
      const box = h("input", { type: "checkbox", id });
      box.checked = !!s.features[key];
      box.addEventListener("change", () => { s.features[key] = box.checked; saveDraft(); });
      return h("div", { class: "dev-toggle" }, box,
        h("label", { for: id }, h("strong", { text: FEATURE_INFO[key][0] }), h("span", { class: "dev-field-hint", text: FEATURE_INFO[key][1] })));
    });

    const devId = nextId();
    const devBox = h("input", { type: "checkbox", id: devId });
    devBox.checked = !!s.showDevLink;
    devBox.addEventListener("change", () => { s.showDevLink = devBox.checked; saveDraft(); });

    root.replaceChildren(h("div", { class: "dev-card" },
      ...rows,
      field({ label: "تاريخ امتحان البكالوريا", hint: "يُستعمل للعدّاد فقط.", value: s.bacDate, type: "date", dir: "ltr",
        onInput: v => { s.bacDate = v; }, validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? "" : "أدخل تاريخًا صالحًا." }),
      h("div", { class: "dev-toggle" }, devBox, h("label", { for: devId },
        h("strong", { text: "إظهار رابط لوحة الإدارة في التذييل" }),
        h("span", { class: "dev-field-hint", text: "الأفضل إبقاؤه مخفيًا؛ اللوحة متاحة دائمًا عبر /dev.html." })))
    ));
  }

  function initHashTool(){
    document.getElementById("makeHash").addEventListener("click", async () => {
      const pass = document.getElementById("newPass").value;
      const out = document.getElementById("hashOut");
      if(pass.length < 10){ out.hidden = false; out.value = "اختر رمزًا من 10 أحرف على الأقل."; return; }
      if(!window.crypto || !crypto.subtle){ out.hidden = false; out.value = "غير متاح هنا — افتح اللوحة عبر https أو localhost."; return; }
      out.hidden = false;
      out.value = `devPassHash: "${await sha256hex(PASS_SALT + pass)}"`;
      out.select();
    });
  }

  /* ======================================================================
     Validation + data.js generation
     ====================================================================== */
  const clean = v => String(v ?? "").trim();
  const cleanList = arr => (Array.isArray(arr) ? arr : []).map(clean).filter(Boolean);

  function collect(){
    const errors = [];
    const ids = new Set();
    const subjects = state.subjects.map((s, i) => {
      const label = s.name || `المادة ${i + 1}`;
      const id = clean(s.id);
      if(!MB.isSafeId(id)) errors.push(`${label}: المعرّف غير صالح.`);
      else if(ids.has(id)) errors.push(`${label}: المعرّف «${id}» مكرر.`);
      ids.add(id);
      if(!clean(s.name)) errors.push(`المادة ${i + 1}: الاسم مطلوب.`);
      const drive = MB.safeDriveUrl(clean(s.driveUrl));
      if(!drive) errors.push(`${label}: رابط Drive غير صالح.`);
      if(!MB.isSafeAccent(s.accent)) errors.push(`${label}: اللون غير صالح.`);
      const icon = MB.serializeIcon(s.icon);
      if(icon === null) errors.push(`${label}: أيقونة SVG غير صالحة.`);
      const playlists = (Array.isArray(s.playlists) ? s.playlists : []).map(p => ({
        title: clean(p.title),
        url: clean(p.url),
        desc: clean(p.desc)
      })).filter(p => p.title || p.url);
      return { id, name: clean(s.name), desc: clean(s.desc), accent: clean(s.accent), driveUrl: drive || clean(s.driveUrl), icon: icon || "", playlists };
    });
    if(!subjects.length) errors.push("يجب أن تبقى مادة واحدة على الأقل.");

    const info = state.info.map((sec, i) => {
      const icon = MB.serializeIcon(sec.icon);
      if(icon === null) errors.push(`المحور ${i + 1}: أيقونة SVG غير صالحة.`);
      if(!clean(sec.title)) errors.push(`المحور ${i + 1}: العنوان مطلوب.`);
      return { title: clean(sec.title), icon: icon || "", tips: cleanList(sec.tips) };
    });

    const text = {};
    for(const [group, values] of Object.entries(state.text)){
      text[group] = {};
      for(const [key, val] of Object.entries(values || {})){
        text[group][key] = Array.isArray(val) ? cleanList(val) : String(val ?? "").replace(/\r\n/g, "\n").trim();
      }
    }

    const st = state.settings;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(st.bacDate || ""))) errors.push("الإعدادات: تاريخ البكالوريا غير صالح.");
    const settings = {
      features: Object.fromEntries(Object.keys(FEATURE_INFO).map(k => [k, !!(st.features || {})[k]])),
      bacDate: String(st.bacDate || ""),
      showDevLink: !!st.showDevLink
    };
    return { errors, subjects, info, text, settings };
  }

  function buildDataJsText(d){
    const j = v => JSON.stringify(v, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    return `/* ==========================================================================
   مكتبة الباك — data.js
   وُلِّد هذا الملف عبر لوحة الإدارة (dev.html) بتاريخ ${stamp}.
   مصدر واحد لكل محتوى الموقع: المواد، النصائح العامة، كل النصوص، والإعدادات.
   ========================================================================== */

const SUBJECTS = ${j(d.subjects)};

/* ---------- محتوى صفحة النصائح العامة ---------- */
const INFO_SECTIONS = ${j(d.info)};

/* ---------- كل نصوص الموقع الظاهرة للزوار ---------- */
const SITE_TEXT = ${j(d.text)};

/* ---------- إعدادات وخصائص اختيارية ---------- */
const SITE_SETTINGS = ${j(d.settings)};
`;
  }

  function showErrors(errors){
    setStatus(`لم يُنشأ الملف — صحّح أولًا: ${errors.slice(0, 4).join(" · ")}${errors.length > 4 ? ` (+${errors.length - 4})` : ""}`, "error");
  }

  function initBuild(){
    const preview = document.getElementById("rawPreview");
    document.querySelector(".dev-advanced").addEventListener("toggle", e => {
      if(e.target.open){ const d = collect(); preview.value = buildDataJsText(d); }
    });

    document.getElementById("buildBtn").addEventListener("click", () => {
      const d = collect();
      if(d.errors.length) return showErrors(d.errors);
      const text = buildDataJsText(d);
      preview.value = text;
      const url = URL.createObjectURL(new Blob([text], { type: "text/javascript;charset=utf-8" }));
      const a = h("a", { href: url, download: "data.js" });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("تم تنزيل data.js — ارفعه مكان assets/data.js على الاستضافة.", "ok");
    });

    document.getElementById("copyBtn").addEventListener("click", async () => {
      const d = collect();
      if(d.errors.length) return showErrors(d.errors);
      try{ await navigator.clipboard.writeText(buildDataJsText(d)); setStatus("تم نسخ محتوى data.js.", "ok"); }
      catch{ setStatus("تعذّر النسخ — استعمل زر التنزيل أو معاينة الملف.", "warn"); }
    });

    document.getElementById("discardBtn").addEventListener("click", () => {
      if(!confirm("تجاهل كل التعديلات غير المنزّلة والعودة إلى المحتوى المنشور؟")) return;
      MB.store.remove(DRAFT_KEY);
      state = published();
      renderAll();
      setStatus("عُدت إلى المحتوى المنشور.", "ok");
    });

    document.getElementById("addSubject").addEventListener("click", () => {
      let n = state.subjects.length + 1, id;
      do { id = `subject-${n++}`; } while(state.subjects.some(s => s.id === id));
      state.subjects.push({ id, name: "", desc: "", accent: "#6B6558", driveUrl: "", icon: '<circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1.6" fill="none"/>', playlists: [{ title: "", url: "", desc: "" }] });
      renderSubjects(); saveDraft();
      document.getElementById("subjectsEditor").lastElementChild?.querySelector("input")?.focus();
    });

    document.getElementById("addInfoSection").addEventListener("click", () => {
      state.info.push({ title: "", icon: '<circle cx="15" cy="15" r="10" stroke="currentColor" stroke-width="1.6" fill="none"/>', tips: [""] });
      renderInfo(); saveDraft();
      document.getElementById("infoEditor").lastElementChild?.querySelector("input")?.focus();
    });
  }

  function renderAll(){ renderSubjects(); renderInfo(); renderText(); renderSettings(); }

  document.addEventListener("DOMContentLoaded", () => {
    initLock(() => {
      loadDraft();
      initTabs();
      renderAll();
      initTextSearch();
      initHashTool();
      initBuild();
      initFeedbackTab();
    });
  });

  // exposed for automated tests only
  window.__devTest = { collect, buildDataJsText, getState: () => state };
}());
