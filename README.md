# Maktabat al-Bac (مكتبة الباك)

A static Arabic (RTL) library of baccalaureate resources. Plain HTML, CSS and JS: no backend, no build step, no frameworks. Every file is served as is.

```
index.html  subject.html  info.html  dev.html
assets/
  data.js          ← ALL content: subjects, general tips, every visible string, settings
  site-config.js   ← feedback endpoint + admin passphrase hash
  core.js          ← shared helpers (escaping, validators, text binding, nav)
  motion.js        ← the only motion system (leave fade + scroll reveal)
  script.js        ← home page      subject.js ← subject page      info.js ← tips page
  dev.js           ← admin panel
  style.css        ← all styles (includes @font-face)
  guides/          ← one lazy-loaded study guide per subject (guides/<id>.js)
  guide.js         ← renders the current subject's guide (loads guides/<id>.js on demand)
  fonts/           ← self-hosted Aref Ruqaa + Tajawal (woff2)
  favicon.svg  grain.svg
apps-script/Code.gs   ← optional Google Apps Script backend for feedback
tools/dev.js           ← dev helpers: `csp` check + `cachebust`
tests/                ← node:test unit + data integrity tests
_headers  vercel.json  robots.txt
```

## Editing content

Open `dev.html`, unlock it, and edit anything: subjects, tips, every piece of site text (hero, buttons, nav, about, footer, form labels, error messages, page titles and meta descriptions), plus the feature toggles. Then click **Download data.js** and replace `assets/data.js` on your host. Nothing is published until you upload the file. Drafts autosave in that browser only.

Text may contain `{name}`, `{year}`, `{n}` tokens. They are filled in automatically, so keep them when you edit. Line breaks in the hero title are kept.

## Preview locally

Opening `index.html` directly (`file://`) works, but Chrome blocks web fonts on `file://`, so the pages fall back to system fonts. For an accurate preview, run a local server:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

## Development checks (optional, needs Node.js)

```
npm install        # one-time, installs jsdom for tests
npm test           # unit + data integrity tests (tests/)
npm run check:csp  # verifies meta CSP == _headers == vercel.json
npm run cachebust  # stamps assets with ?v=<package.json version>
```

Bump `version` in package.json and run `npm run cachebust` on every deploy so
browsers pick up new files. Subject study guides live in `assets/guides/<id>.js`
and are loaded only when that subject page opens.

## The dev.html passphrase: what it is and what it is not

It is a **deterrent, not authentication.** The page, `data.js` and everything the panel shows are public files. Anyone can read them, gate or no gate. The passphrase only keeps casual visitors out of the editor UI. The panel cannot publish anything by itself: changes go live only when *you* upload a new `data.js` to your host, so your hosting account is the real protection.

The one thing that *is* private (the list of submitted feedback) is **not** protected by the passphrase. It is protected on the server by `ADMIN_TOKEN` (see below). Before this change, the feedback list endpoint had no authentication at all.

Change the passphrase: dev.html → Settings → enter a new passphrase → copy the hash → paste it into `devPassHash` in `assets/site-config.js`. The default passphrase is `maktabat2026`. **Change it before deploying.**

## Feedback backend (optional)

With `feedbackEndpoint` empty, the form runs in local preview mode: submissions are stored only in the visitor's own browser.

To collect real feedback:

1. Create a Google Sheet → Extensions → Apps Script → paste `apps-script/Code.gs`.
2. Project Settings → Script properties → add `ADMIN_TOKEN` = a long random string (16+ characters; 32+ recommended). Without it, reading feedback is disabled.
3. Deploy → New deployment → Web app → **Execute as: Me**, **Who has access: Anyone**. Copy the `/exec` URL.
4. Put it in `assets/site-config.js` → `feedbackEndpoint`. The site refuses non-HTTPS URLs and URLs with embedded credentials, and the CSP blocks any host other than Google Apps Script, so a mistyped or tampered endpoint fails closed: nothing is sent, and the form shows "not available".
5. In dev.html → Feedback, enter the `ADMIN_TOKEN` to load submissions. The token is kept in memory only and is never saved.

What the server enforces: honeypot, length limits (name 60, message 5–1000), subject id pattern, rating clamped 0–5, server-side timestamp, spreadsheet formula-injection guard, a global rate limit of 20 submissions per minute, a write lock, a constant-time token check with a delay on failure, and a cap of 500 rows returned.

Limits: Apps Script cannot see visitor IPs, so the rate limit is global. A determined spammer can use up the per-minute quota, but cannot flood the sheet beyond ~28,800 rows a day. If that ever happens, add a CAPTCHA (Cloudflare Turnstile) and allow its domain in the CSP.

If you use a different backend host, update `connect-src` in the `<meta>` CSP of `index.html` and `dev.html`, in `_headers` and in `vercel.json`.

## Security summary

- Strict CSP on every page: no inline scripts or styles, no `eval`, only same-origin assets. `connect-src 'none'` on pages that never send anything. `base-uri`, `form-action` and `object-src` are locked.
- Deploy with `_headers` (Netlify / Cloudflare Pages) or `vercel.json` to add what a `<meta>` CSP cannot do: `frame-ancestors 'none'` (clickjacking), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `noindex` + `no-store` for `dev.html`. GitHub Pages cannot set headers; the `<meta>` CSP still applies there.
- All content (from `data.js`, the panel, or visitors) is inserted with `textContent` or DOM APIs. `innerHTML` is never used with data. Subject ids, accent colors (`var(--c-…)` or `#rrggbb`), Drive links (https + Google Drive/Docs only) and SVG icons (allowlisted elements and attributes, re-serialized) are validated both in the panel and at render time. A hand-edited `data.js` cannot inject markup.

## Features (toggle in dev.html → Settings)

| Feature | Default | Tradeoff |
|---|---|---|
| "Continue where you left off" link on home | on | Stores the last subject id in localStorage (no personal data). |
| Copy button on each tip | on | Needs HTTPS (or localhost). Hidden until hover on desktop, always visible on touch. |
| Countdown to the bac date | off | Motivating for some students, stressful for others. Set the real date first (placeholder: 2027-06-13). |
| Admin link in footer | off | Convenient, but advertises the panel. |

## Removed on purpose

- **GSAP + ScrollTrigger** (~115 KB) and **transitions.js**: replaced by CSS animations and one IntersectionObserver in `motion.js`.
- **Animated blurred background blobs**: replaced by a static paper-grain texture and a one-time drawn ornament (cheap on low-end phones).
- **Google Fonts CDN**: fonts are self-hosted, so the CSP can be `font-src 'self'` and no visitor data goes to a third party.
- No Lenis, no custom cursor, no magnetic hovers, and exactly one page-transition mechanism (a 160 ms fade out and a 300 ms fade in). All motion is off under `prefers-reduced-motion`.
