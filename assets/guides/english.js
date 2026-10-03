/* ==========================================================================
   مكتبة الباك — guides/english.js
   دليل الدراسة الخاص بمادة واحدة (يُحمَّل عند الحاجة فقط في صفحة المادة).
   النص يُعرض عبر textContent فقط (لا HTML) — آمن من الحقن.
   ========================================================================== */

(function () {
  "use strict";

  function deepFreeze(o){
    Object.values(o).forEach(v => { if (v && typeof v === "object") deepFreeze(v); });
    return Object.freeze(o);
  }

  const guide = {
    "title": "كيف تدرس الإنجليزية؟",
    "sections": [
      {
        "id": "en-1",
        "title": "أولاً: المصادر",
        "blocks": [
          { "t": "p", "x": "في الإنجليزية، لا أنصح بالغرق في المصادر." },
          { "t": "p", "x": "هناك عدد كبير من الكتب الخارجية، لكنك لا تحتاج إلى أكثر من كتاب واحد." },
          { "t": "p", "x": "اختر أكثر الكتب اختصاراً وتنظيماً، والذي يغطي جميع الدروس المقررة، خصوصاً في:" },
          { "t": "flow", "items": ["جزء القواعد", "منهجية التعامل مع أسئلة النص"] },
          { "t": "p", "x": "في هذا الجزء تحديداً، الاعتماد المفرط على درس القسم قد يكون مضيعة للوقت، لأن حجم ما تحتاج إلى معرفته فعلياً محدود مقارنةً بالكم الكبير الذي قد يوجد في الدروس المكتوبة." },
          { "t": "p", "x": "بدلاً من محاولة كتابة موضوع جديد بالكامل كل مرة، قم بإعداد وضعيات قابلة لإعادة الصياغة والتوظيف." },
          { "t": "callout", "x": "لدينا 3 وحدات مقررة + 4 وضعيات ترد في كلا الموضوعين (2 في كل موضوع)." },
          { "t": "p", "x": "وهذا يعني أن نفس الوحدة يمكن أن تظهر مرتين على الأكثر، بينما قد تأتي الوحدات الأخرى مرة واحدة أو مرتين في نفس الموضوع." },
          { "t": "p", "x": "مثلاً:" },
          { "t": "ul", "items": ["الموضوع الأول: الوضعية 1: الوحدة 1، الوضعية 2: الوحدة 2", "الموضوع الثاني: الوضعية 1: الوحدة 3، الوضعية 2: الوحدة 1"] },
          { "t": "p", "x": "بالمختصر، فإن وحدة واحدة على الأقل من الوحدتين 2 و 3 ترد في الامتحان." },
          { "t": "p", "x": "أما الوحدتان الثانية والثالثة، فمفيد تحضير وضعياتهما مسبقاً لأن عددها محدود، في حدود 10 وضعيات تقريباً معاً، مقارنة بحوالي 16 موضوعاً يمكن أن يرتبط بالوحدة الأولى (كما أن فيها من الوضعيات الاستنتاجية)." },
          { "t": "p", "x": "مع إمكانية إعادة صياغة الوضعية إذا ورد السؤال بطريقة استنتاجية." },
          { "t": "p", "x": "أي لا تحفظ نصاً واحداً فقط." },
          { "t": "p", "x": "بل حاول الاحتواء بجميع العناصر الممكنة التي يمكن أن تدخل في الوضعية." },
          { "t": "p", "x": "كجمع جميع الأسئلة المتعلقة بال advertising (causes, consequences, results, food advr, celebrity advr...)" },
          { "t": "h3", "x": "اجعل الوضعية معيار الاختيار" },
          { "t": "p", "x": "عندما تدخل الامتحان، لا تنظر فقط إلى عنوان الوحدة." },
          { "t": "p", "x": "انظر إلى:" },
          { "t": "callout", "x": "أي وضعية أستطيع أن أكتب عنها بأكبر قدر من الثقة؟" },
          { "t": "p", "x": "ولهذا يجب أن يكون الجزء الأول، الخاص بفهم النص والقواعد، متقناً قدر الإمكان، حتى يصبح اختيار الموضوع مبنياً على الوضعية التي تناسب مخزونك المعرفي." }
        ]
      },
      {
        "id": "en-2",
        "title": "ثانياً: طريقة التحضير",
        "blocks": [
          { "t": "h3", "x": "استعمال الذكاء الاصطناعي في التعبير" },
          { "t": "p", "x": "يمكن للذكاء الاصطناعي أن يكون مفيداً جداً في تحسين مستوى التعبير، خصوصاً في بناء الفقرات وتوسيع الأفكار." },
          { "t": "p", "x": "فيمكنك إعطاؤه بنية دقيقة لما تريده." },
          { "t": "p", "x": "وهذا مثال على Prompt ذو كفاءة عالية:" },
          { "t": "quote", "x": "I want you to help me build high-quality English expression paragraphs. I will give you a topic and the main titles/ideas I want to cover." },
          { "t": "h4", "x": "Introduction:" },
          { "t": "p", "x": "Write a strong, natural and engaging introduction. It should not be too long. Briefly introduce and define the topic when appropriate, then lead naturally to the main issue. Use elegant but clear expressions suitable for a high-level student." },
          { "t": "h4", "x": "Body:" },
          { "t": "p", "x": "Keep the titles I provide. Under each title, give around four ideas. Each idea should be written on a separate line and should be concise, clear and easy to develop in an exam." },
          { "t": "p", "x": "Add a relevant example when useful. You may also use a simple analogy, statistic, research finding or real-world reference when it genuinely strengthens the idea. Do not add information just for decoration." },
          { "t": "h4", "x": "Conclusion:" },
          { "t": "p", "x": "Write a concise and memorable ending that summarizes the main point and closes the topic naturally. A relevant quotation may be added when appropriate." },
          { "t": "h4", "x": "General requirements:" },
          { "t": "ul", "items": ["Keep the English natural rather than overly sophisticated.", "Avoid unnecessary C2 vocabulary.", "Avoid clichés and generic filler.", "Prefer precise, reusable expressions.", "Make the ideas easy to memorize and adapt to similar prompts.", "Correct any weak or repetitive idea rather than blindly following my outline."] },
          { "t": "p", "x": "After writing, briefly identify which ideas are the most reusable across other topics." },
          { "t": "p", "x": "بهذه الطريقة يصبح الذكاء الاصطناعي أداة لبناء مخزون تعبيري قابل لإعادة الاستخدام." }
        ]
      }
    ]
  };

  window.SUBJECT_GUIDES = window.SUBJECT_GUIDES || {};
  window.SUBJECT_GUIDES["english"] = deepFreeze(guide);
})();
