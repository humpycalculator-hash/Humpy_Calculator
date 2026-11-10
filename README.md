# Humpy Calculator — how everything works

A **fully static** website: plain HTML + CSS + JavaScript. No database, no server code, no build step, no API calls.
Every calculation happens inside the visitor's browser. If you can open a folder and edit text files, you can maintain it.

- [1. Run it and publish it](#1-run-it-and-publish-it)
- [2. Folder map](#2-folder-map)
- [3. How a page works](#3-how-a-page-works)
- [4. How a calculator is written](#4-how-a-calculator-is-written)
- [5. Everyday jobs (add / edit / remove)](#5-everyday-jobs-add--edit--remove)
- [6. Styling (CSS)](#6-styling-css)
- [7. Security](#7-security)
- [8. Testing checklist](#8-testing-checklist)
- [9. What changed from the old version](#9-what-changed-from-the-old-version)

---

## 1. Run it and publish it

**Run locally.** Use VS Code → right-click `index.html` → *Open with Live Server* (set the port to 5501 in your own VS Code settings if you like),
or run `python3 -m http.server 5501` in this folder and open `http://localhost:5501`.
Do not double-click `index.html`: page links such as `calculators/math/` are folders and need a web server (every real host works).

**Developer-only files.** `docs/` and `.vscode/` (old notes, unused images, the original full-size icon, editor settings) are **not part of this repository**.
They are kept on the developers' own computers, and `.gitignore` stops them from being pushed to GitHub or deployed. If you restore them locally, they stay private.

**Push to GitHub.** `git init`, `git add .`, `git commit`, then push. Before the first push run `git status` and check that no `docs/`, `.vscode/`, `.env` or `.zip` file is listed.
Never commit passwords or API keys (this site needs none).

**Publish.** Deploy the repository contents to your host (on Cloudflare Pages: connect the GitHub repo, framework preset *None*, build command empty, output directory `/`).
Then use the *one* security file that matches your host (details in [Security](#7-security)):

| Host | Security/redirect file used |
|---|---|
| Netlify, Cloudflare Pages | `_headers` + `_redirects` |
| Apache / LiteSpeed / cPanel shared hosting | `.htaccess` |
| Anything else (Vercel, GitHub Pages, …) | copy the header list from `_headers` into that host's settings |

Delete the files that do not match your host.

---

## 2. Folder map

```
Humpy_Calculator/
├── index.html                  Home page
├── favicon.svg                 Browser-tab icon (the theme picker recolours it automatically)
├── 404.html                    "Page not found" page (Cloudflare Pages and Apache use it automatically)
├── robots.txt  sitemap.xml     Tell Google which pages exist (domain is written inside; see "Change the live domain" in section 5)
├── _headers  _redirects        Security headers + old-URL redirects (Netlify / Cloudflare Pages)
├── .htaccess                   Same job for Apache / cPanel hosting
├── .gitignore                  Keeps developer-only and junk files out of GitHub
├── LICENSE                     Copyright / usage terms
├── SECURITY.md                 How to report a security problem (shown on GitHub's Security tab)
├── README.md                   This guide
│
├── shared/                     Used by EVERY page
│   ├── css/
│   │   ├── base.css            Reset, colours/fonts (design tokens), themes + dark mode, typography, buttons, banners
│   │   ├── navbar.css          Top bar, "Calculators" dropdown, theme picker, mobile menu
│   │   ├── footer.css          Footer + back-to-top button
│   │   └── calculator.css      Layout shared by the six calculator pages (fields, solution box, dropdown…)
│   └── js/
│       ├── utils.js            Number formatting, validation, field builders, SECURITY helpers (escapeHtml, sanitizeHtml)
│       ├── site-config.js      THE list of categories, navbar order and colour themes
│       ├── disclaimer.js       The "Estimates, not advice" pop-up on the Health and Finance pages (see README section 5)
│       ├── layout.js           Builds navbar + footer on every page; theme/dark-mode; menus; back-to-top
│       └── calculator-engine.js  The engine behind all calculator pages (draws fields, validates, shows the solution)
│
├── calculators/                One folder per calculator page — each has its own html, css and js
│   ├── math/        index.html  math.css       math.js   (+ rational.js: exact fractions, gpa.js: GPA/SGPA/CGPA screens)
│   ├── finance/     index.html  finance.css    finance.js
│   ├── physics/     index.html  physics.css    physics.js
│   ├── chemistry/   index.html  chemistry.css  chemistry.js
│   ├── conversion/  index.html  conversion.css conversion.js
│   └── health/      index.html  health.css     health.js
│
├── home/        home.css  home.js        Home page only (hero symbols, category cards, "More to explore" carousel)
├── about/       index.html  about.css    About page
├── privacy/     index.html  privacy.css  Privacy Policy (privacy.css is also used by Terms, Contact and 404)
├── terms/       index.html               Terms of Use
├── contact/     index.html               Contact page
├── formulas/    index.html  formulas.css  formulas.js   "Formulas & definitions" (built automatically)
└── assets/                     Images/icons used by the Home page
```

`docs/` and `.vscode/` are not in the repository (see section 1); each developer may keep a private local copy.


The folder name **is** the page address: `calculators/math/` → `https://yoursite.com/calculators/math/`.

---

## 3. How a page works

Every page is plain HTML that loads **CSS first, then scripts** (all at the bottom of the page):

1. `<div id="site-header">` and `<div id="site-footer">` are empty placeholders. `shared/js/layout.js` replaces them with the real navbar and footer.
2. **A calculator page** (e.g. `calculators/physics/index.html`) loads, in this order:
   `utils.js` → `site-config.js` → `physics.js` → `layout.js` → `calculator-engine.js`.
   - `physics.js` fills `CATEGORIES.physics` with the list of calculators.
   - `calculator-engine.js` reads `<div id="calculator-app" data-category="physics">`, finds that entry in `CATEGORIES`, and builds the
     "Select operation" dropdown, the input fields, the *Common formulas* list and the *Related calculators* list.
   - When someone presses **Calculate Result** the engine collects the inputs, runs that calculator's `calculate()` function and draws the steps.
3. **The Formulas page** loads *every* category file and prints each calculator's `label`, `formula` and `definition`. Nothing to maintain by hand.
4. **Fixed rule:** the folder name, the `data-category="…"` value and the `CATEGORIES.<name>` key must all be the same word.

---

## 4. How a calculator is written

Every calculator is one entry inside `calculators/<name>/<name>.js`. Example (a real one, simplified):

```js
force: {                                          // key (any unique word; becomes the dropdown value)
  label: "Force (F = m × a)",                     // text in the dropdown
  resultLabel: "Force",                           // heading above the answer
  formula: "F = m × a",                           // shown in "Common formulas" + Formulas page
  definition: "Newton's second law: force equals mass multiplied by acceleration.",   // Formulas page
  fields: [                                       // the input boxes, top to bottom
    numField("m", "Mass (kg)", "e.g. 5"),         // numField(id, label, placeholder)
    numField("a", "Acceleration (m/s²)", "e.g. 2"),
  ],
  calculate: (v) => {                             // v.m and v.a hold what the visitor typed (numbers, or "" if empty)
    const m = nonNegative(v.m, "Mass");           // validators throw a friendly error if the value is wrong
    const a = assertNumber(v.a, "Acceleration");
    const r = m * a;
    return {                                      // what the solution box shows
      result: formatNumber(r),
      unit: "N",
      steps: ["F = m × a", `F = ${formatNumber(m)} × ${formatNumber(a)} = ${formatNumber(r)} N`],
    };
  },
},
```

**Field builders** (`shared/js/utils.js`):

| Builder | Use |
|---|---|
| `numField(id, label, placeholder, extra?)` | number box (commas are added while typing) |
| `textField(id, label, placeholder, extra?)` | text box (add `{ maxlength: 60 }` to limit length) |
| `selectField(id, label, opts([value, label], …), extra?)` | dropdown |

`extra` may contain `hint` (small grey text), `section` (heading above a group), or `dependsOn` + `variants`
(change/hide a box when another dropdown changes — see *Area & Perimeter* or *Ideal Gas Law*).

**Validators** (they throw an `Error` whose message is shown to the visitor):
`assertNumber(value, "Label", {min, max})`, `nonNegative(value, "Label")`, `positive(value, "Label")`.

**What `calculate()` may return:**

| Key | Meaning |
|---|---|
| `result` | the answer text |
| `unit` | unit shown after the answer (optional) |
| `resultText` | use instead of `result + unit` when you want custom text |
| `steps` | list of strings (or `{title, expression}`) shown as numbered steps |
| `secondary` | `{label, value}` a smaller second answer (e.g. Total Payable) |
| `details` | list of `{label, value}` rows for the "Calculation details" box |

**Text safety:** inside `steps`/`details` only `<br>` and `<strong>…</strong>` are kept as HTML; everything else is shown as plain text automatically.
If you ever include something the visitor typed, wrap it: `escapeHtml(text)`.

**Math page:** uses exact fractions (`rational.js`) so `0.1 + 0.2` is exactly `0.3`. Use `toQ(v.x, "Label")`, `Q.add / Q.mul / Q.div…`, and `showQ(result)` to display.

---

## 5. Everyday jobs (add / edit / remove)

### Add a calculator to an existing page
1. Open `calculators/<page>/<page>.js` (e.g. `physics.js`).
2. Copy any block, paste it next to the others, give it a **new unique key**, edit `label`, `formula`, `definition`, `fields`, `calculate`.
3. Save and refresh. The dropdown, *Common formulas*, and the Formulas & definitions page update by themselves.
4. If the Home page/About page text mentions how many tools a page has (for example the `<meta name="description">` of `calculators/math/index.html`), update that sentence.

### Edit a calculator
Change its block in the same file. Every place that shows it (dropdown, formulas list, Formulas page) reads from that one block.

### Remove a calculator
Delete its block from `<page>.js`. Nothing else to change.

### Add a unit / currency / chemical element / grade scale
| What | Where |
|---|---|
| Length, mass, volume, data, area unit | one line in the matching table at the top of `calculators/conversion/conversion.js` |
| Currency for the *Currency* converter | `CURRENCIES` in `conversion.js` |
| Currency in Finance dropdowns | `CURRENCY_FIELD` in `finance.js` **and** `CURRENCY_SYMBOLS` in `shared/js/utils.js` |
| Chemical element | `ATOMIC_MASS` in `calculators/chemistry/chemistry.js` |
| GPA grading-scale preset | `GRADE_PRESETS` in `calculators/math/gpa.js` |

### Add a brand-new calculator PAGE (e.g. "Statistics")
1. **Copy** the folder `calculators/physics/` → `calculators/statistics/`. Rename `physics.css` → `statistics.css`, `physics.js` → `statistics.js`.
2. In `calculators/statistics/index.html` use *Find & Replace*: `physics` → `statistics` and `Physics` → `Statistics`
   (this fixes the CSS link, the script path, `data-category="statistics"` and the title). Then rewrite the description meta tag and the hero sentence.
3. In `statistics.js` change `CATEGORIES.physics` to `CATEGORIES.statistics`, delete the physics calculators and add yours.
4. In `shared/js/site-config.js` add `["statistics", "Statistics"]` to `categories` **and** `"statistics"` to `nav`
   (this puts it in the navbar dropdown, in *Related calculators*, and on the Formulas page).
5. In `formulas/index.html` add `<script src="../calculators/statistics/statistics.js"></script>` just above the `layout.js` line.
6. *(Optional, Home page)* copy one `calc-card` block in `index.html` (and add its colours in `home/home.css`, like `.glyph-heading.is-physics`),
   and add one entry to `ITEMS` in `home/home.js` for the "More to explore" carousel.
7. Test it ([checklist](#8-testing-checklist)).

### Remove a calculator PAGE
Delete its folder under `calculators/`, delete its line from `categories` and `nav` in `site-config.js`, delete its `<script>` line in `formulas/index.html`,
and delete its card in `index.html` and its entry in `ITEMS` (`home/home.js`).

### Other common edits
| I want to… | Edit |
|---|---|
| Change navbar order | `nav` list in `shared/js/site-config.js` |
| Add / change a colour theme | add a `{value,label,color}` row in `SITE.themes` (`site-config.js`) **and** copy a `:root[data-theme="…"]` block in `shared/css/base.css` |
| Change developers, contact e-mail, footer text | `footerHTML` in `shared/js/layout.js` (the e-mail also appears in `about/`, `privacy/`, `terms/`, `contact/` and `SECURITY.md`: use *Find in Files*) |
| Add or change the social links | `SITE.social` in `shared/js/site-config.js`. `"#"` shows the icon but the link does nothing yet; paste the full `https://…` address to make it live; `""` hides that icon. Add a new network by adding its icon to `SOCIAL_ICONS` in `layout.js`. The Privacy Policy mentions Facebook and Instagram: update it if you add or remove a network |
| Edit the written text under a calculator (about, examples, tips, FAQ) | the `<section class="calc-guide">` block in that page's `index.html` (plain HTML, between `GUIDE:START` and `GUIDE:END`). Keep examples correct: run the numbers through the calculator first |
| Change the disclaimer pop-up text, or show it on another calculator page | `MESSAGES` at the top of `shared/js/disclaimer.js` (the key is the page's `data-category`). It is loaded only by the Health and Finance pages; to add a page, add a message and one `<script src="../../shared/js/disclaimer.js"></script>` line to that page. It is remembered per browser tab in `sessionStorage` (listed in the Privacy Policy) |
| Add a hover effect | In CSS use `transform: scale(...)`, colour, border or shadow, **never** `translate` or `rotate` on `:hover`: a card that moves away from the pointer makes the hover flicker (the "shaking" bug). See the "Hover: stable" block at the end of `shared/css/calculator.css` |
| Change the live domain | `https://humpycalculator.com` is written in `robots.txt`, `sitemap.xml` and the `canonical` / `og:url` tags of every page. Use *Find in Files → Replace All* if the real address is different |
| Change a page's title/description (Google result text) | the `<title>` and `<meta name="description">` in that page's `index.html` |
| Show the Dark mode button | it is hidden on purpose (as in the old version): delete `display: none` from `.theme-mode-option` in `shared/css/navbar.css` |

---

## 6. Styling (CSS)

- **Colours, fonts, shadows** are CSS variables at the top of `shared/css/base.css` (`--color-primary`, `--font-body`, …). Change them there and the whole site follows.
- Each CSS file has a header comment saying what it styles and section comments inside it. Rules are written compactly (several properties per line).
- Where to put new styles: *every page* → `base.css`; *only calculator pages* → `shared/css/calculator.css`; *only one page* → that page's own css file
  (`calculators/<name>/<name>.css`; the finance, physics, chemistry and health files are intentionally empty — ready for page-specific styles).
- **Do not use `style="…"` attributes** in HTML or JavaScript markup: the security policy blocks them. Use a class and a rule in a css file.

---

## 7. Security

This is a static site: there is no server, database or login to break into, which removes most attacks. What remains, and what is done about it:

| Risk | Protection in this project |
|---|---|
| **Cross-site scripting (XSS)** — injected `<script>`/`<img onerror>` text | Strict **Content-Security-Policy**: only this site's own files + Google Fonts may load; inline scripts and inline `style=""` are blocked (`<meta>` tag in every page **and** `_headers`/`.htaccess`). All text is also escaped before it is shown (`escapeHtml`, `sanitizeHtml` in `utils.js`; the old Average/GPA error messages could execute typed HTML — fixed). |
| **Clickjacking** (site hidden inside another site's frame) | `frame-ancestors 'none'` + `X-Frame-Options: DENY` headers, plus a script fallback in `layout.js` |
| **Tampered stored settings** | Theme, dark-mode and GPA scale read from `localStorage` are checked against allowed values and size limits before use |
| **Browser freezing / denial of service** | Inputs have `maxlength`; GPA tables have row limits; the square-root calculator was rewritten (the old one froze the tab on numbers near `1e308`); huge exponents are capped |
| **Prototype tricks** (`__proto__`, `constructor` as a unit name) | Table lookups use `own()` (own properties only) |
| **Downgrade / eavesdropping** | HTTPS redirect + `Strict-Transport-Security` |
| **Content sniffing, tracking, sensors** | `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera, mic, location… off) |
| **Leaking developer files** | `docs/` and `.vscode/` are no longer in the project and are listed in `.gitignore`, so they never reach GitHub or Cloudflare Pages (which ignores `.htaccess`). `.htaccess` still blocks them on Apache hosts as a second layer |
| **Secrets in GitHub** | The site has no passwords or API keys. `.gitignore` also excludes `.env` files and `.zip` files. Check `git status` before every push |
| **Reporting problems** | `SECURITY.md` (GitHub) tells researchers to report privately |

| **External links** | contact link uses `rel="noopener noreferrer"` |

**Important limits (be realistic):** nothing is "unhackable". The biggest real-world risks for a static site are *outside* the code:
1. Turn on **2-factor authentication** for your GitHub account, your host (Cloudflare), Spaceship (domain) and the e-mail account that receives `humpycalculator@gmail.com`. A stolen account can replace the whole site.
2. Lock the domain (registrar lock) and keep DNS records limited to what you need.
3. Only upload files you trust; if you add third-party scripts (analytics, ads) they run with full power on your pages.
4. Keep the `_headers`/`.htaccess` file on the server — the `<meta>` tag alone cannot send clickjacking/HSTS protection.

**When you add Google AdSense / analytics:** the policy will block them until you allow their hosts. Google publishes the exact list
(search "AdSense Content Security Policy"). Add those hosts to `script-src`, `img-src`, `frame-src` and `connect-src` in **all three places**:
the `<meta http-equiv="Content-Security-Policy">` line of every `index.html`, `_headers`, and `.htaccess`. (Tip: use VS Code *Find in Files* to change all pages at once.)
Do not add `'unsafe-inline'` or `'unsafe-eval'` — it would switch the protection off.

**Rules for future code (keep the protection):**
- Never put visitor-typed text into `innerHTML` without `escapeHtml()`.
- No inline `<script>`, `onclick="…"`, or `style="…"` — use files, `addEventListener`, and CSS classes.
- Use `own(table, key)` instead of `table[key]` when `key` comes from the page.
- No `eval()` / `new Function()`.

---

## 8. Testing checklist

After any change, open the affected page and check:
1. Page loads, no red errors in the browser console (F12 → Console). A message mentioning "Content Security Policy" means something inline slipped in.
2. Each calculator in the dropdown: calculate with sensible numbers, then with blank, `abc`, `-5` and `0` — you should get a friendly message, never a blank screen.
3. Change the theme (Theme button) and refresh — the choice is remembered.
4. Phone width (F12 → device toolbar): menu button works, nothing overflows sideways.
5. The Formulas & definitions page lists the new/changed calculator.
6. Home → "More to explore" arrows and links still open the right pages.
7. Footer links (Privacy Policy, Terms of Use, Contact) open the right pages, and the social icons do not jump the page while their link is still `#`.
8. Type a wrong address (for example `/nothing/`) to see the 404 page.

---

## 9. What changed from the old version

- **New structure:** one folder per page with its own HTML, CSS and JS; shared code in `shared/`. The one 2,248-line `calculators.js` is now one file per calculator page;
  the 2,500-line `style.css` is split into shared and per-page files.
- **Page addresses:** `/calculators/math.html` → `/calculators/math/` (same for `about`, `privacy`, `formulas`). Old addresses are redirected by `_redirects` / `.htaccess`.
- **Same features and results:** every calculator, step text, unit, theme, animation and layout behaves as before (verified automatically: 927 calculator runs, all GPA/CGPA flows and the menus gave identical results; every page matched pixel-for-pixel layout and styles in light/dark, six themes and five screen widths).
- **Less duplication:** the four Health calculators that were defined twice (BMR, Calorie Needs, Ideal Weight, Water Intake) now exist once; the currency list that was copied six times in Finance is one constant; dead CSS and unused code were removed; inline styles became classes.
- **One visible text change:** the *Formulas & definitions* page used to show an older wording for those four Health items; it now shows the same (more careful) wording as the Health calculator page.
- **Security:** everything in [Security](#7-security).
- **Speed:** `assets/health-icon.png` went from 1.2 MB to 100 KB (same look). The unused IBM Plex Mono font request was removed (nothing used it).
- **Moved out of the site** into a private local `docs/` folder (not in the repository): the old `change.txt` (now `dev-notes.txt`), `camel.svg`, the unused app-icon image, and the original full-size health icon.
- **Before the first GitHub push (Nov 7, 2026):** added `.gitignore`, `LICENSE` and `SECURITY.md`; removed `docs/` and `.vscode/` from the project; removed the placeholder social links (they pointed nowhere); corrected the Privacy Policy (removed the social-links item, fonts list now says Inter only, date updated).
- **Before launch (Nov 7, 2026):** footer social icons (Facebook, Instagram) are now driven by `SITE.social` and are placeholders (`#`) until the real links are pasted in; added the **Terms of Use** and **Contact** pages and footer links; added a written guide (about, 3 worked examples, tips, FAQ) under each of the six calculator pages; added `404.html`, `robots.txt`, `sitemap.xml`, canonical and link-preview (Open Graph) tags, and clearer titles and descriptions on every page; Privacy Policy now lists the three items kept in the browser (`theme`, `mode`, `humpy-grade-scale`) and the social links; contact e-mail is `humpycalculator@gmail.com`.
- **Hover and pop-up update (Nov 7, 2026):** fixed the hover "shaking" on calculator pages (formula chips, related links, conversion details, Calculate button) by replacing lift/tilt with a gentle scale; added matching hovers to the new guide section; added the disclaimer pop-up (Health and Finance pages) and listed its `sessionStorage` item in the Privacy Policy.
