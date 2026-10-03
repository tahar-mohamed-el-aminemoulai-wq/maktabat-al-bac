/**
 * Maktabat al-Bac — feedback backend (Google Apps Script web app).
 *
 * Deploy: Extensions → Apps Script in a Google Sheet, paste this file,
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Put the /exec URL into assets/site-config.js → feedbackEndpoint.
 *
 * Script properties (Project settings → Script properties):
 *   ADMIN_TOKEN  — a long random string (≥16 chars). Required to read feedback
 *                  from dev.html. Without it, "list" is disabled entirely.
 *
 * The browser's dev.html password is NOT a security boundary. Everything that
 * must be protected is enforced here, on the server.
 */

var SHEET_NAME = "feedback";
var LIMITS = { name: 60, email: 254, message: 1000, minMessage: 5 };
var RATE_PER_MINUTE = 20;   // global cap on submissions (all visitors)
var LIST_MAX = 500;

function doGet() {
  return json_({ ok: false, error: "method_not_allowed" });
}

function doPost(e) {
  var body;
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length > 8000) return json_({ ok: false, error: "too_large" });
    body = JSON.parse(raw);
  } catch (err) {
    return json_({ ok: false, error: "bad_json" });
  }
  if (!body || typeof body !== "object") return json_({ ok: false, error: "bad_request" });

  if (body.action === "submit") return submit_(body);
  if (body.action === "list") return list_(body);
  return json_({ ok: false, error: "unknown_action" });
}

/* ---------------- submit ---------------- */
function submit_(b) {
  // Honeypot: bots fill every field. Pretend success so they don't adapt.
  if (b.website) return json_({ ok: true });

  var name = clean_(b.name, LIMITS.name);
  var email = clean_(b.email, LIMITS.email);
  var message = clean_(b.message, LIMITS.message);
  var subject = String(b.subject == null ? "" : b.subject);
  var rating = Math.round(Number(b.rating) || 0);

  if (message.length < LIMITS.minMessage) return json_({ ok: false, error: "message_too_short" });
  if (!/^[a-z0-9-]{0,30}$/.test(subject)) subject = "";
  rating = Math.max(0, Math.min(5, rating));
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = "";

  // Global rate limit (Apps Script cannot see client IPs).
  var cache = CacheService.getScriptCache();
  var bucket = "rate_" + Math.floor(Date.now() / 60000);
  var count = Number(cache.get(bucket) || 0);
  if (count >= RATE_PER_MINUTE) return json_({ ok: false, error: "rate_limited" });
  cache.put(bucket, String(count + 1), 120);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return json_({ ok: false, error: "busy" });
  try {
    sheet_().appendRow([
      new Date().toISOString(),       // server time — never trust the client's
      safeCell_(name),
      safeCell_(email),
      safeCell_(subject),
      rating,
      safeCell_(message)
    ]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/* ---------------- list (admin) ---------------- */
function list_(b) {
  var expected = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN") || "";
  if (expected.length < 16) return json_({ ok: false, error: "list_disabled" });
  if (!safeEqual_(String(b.token || ""), expected)) {
    Utilities.sleep(800);                 // slows brute force
    return json_({ ok: false, error: "unauthorized" });
  }
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, items: [] });
  var start = Math.max(2, last - LIST_MAX + 1);
  var rows = sh.getRange(start, 1, last - start + 1, 6).getValues();
  var items = rows.map(function (r) {
    return {
      createdAt: String(r[0]),
      name: unCell_(r[1]),
      email: unCell_(r[2]),
      subject: unCell_(r[3]),
      rating: Number(r[4]) || 0,
      message: unCell_(r[5])
    };
  });
  return json_({ ok: true, items: items });
}

/* ---------------- helpers ---------------- */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["createdAt", "name", "email", "subject", "rating", "message"]);
  }
  return sh;
}

function clean_(v, max) {
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

// Stop spreadsheet formula injection (=HYPERLINK(...), =IMPORTXML(...), etc.)
function safeCell_(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
function unCell_(v) {
  var s = String(v == null ? "" : v);
  return s.charAt(0) === "'" && /^[=+\-@\t\r]/.test(s.slice(1)) ? s.slice(1) : s;
}

// Constant-time comparison: hash both sides so length and content never
// leak through timing, then compare the fixed-length digests.
function safeEqual_(a, b) {
  var ha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a, Utilities.Charset.UTF_8);
  var hb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b, Utilities.Charset.UTF_8);
  var diff = 0;
  for (var i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
