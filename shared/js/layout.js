/* =====================================================================
   layout.js — builds the Navbar + Footer on every page and wires up:
   mobile menu, "Calculators" dropdown, theme picker, light/dark mode,
   back-to-top button and active-link highlighting.
   Every page needs:  <div id="site-header"></div>  and  <div id="site-footer"></div>
   Needs (load before): site-config.js
   ===================================================================== */

// SECURITY: refuse to run inside someone else's <iframe> (clickjacking). The real protection is the
// `frame-ancestors 'none'` header in _headers/.htaccess; this covers hosts that cannot send headers.
if (window.top !== window.self) document.documentElement.style.display = "none";

// Site root URL, worked out from this script's own location (shared/js/ -> two levels up).
// Lets every link work no matter which folder the page lives in.
const SITE_ROOT = new URL("../../", document.currentScript.src).href;
const siteUrl = (path) => SITE_ROOT + path;

const CATEGORY_LABELS = Object.fromEntries(SITE.categories);
const caret = `<svg class="nav-caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
const logoShapes = `<rect class="logo-shape" x="270" y="247" width="120" height="530" rx="35" /><rect class="logo-shape" x="630" y="247" width="119" height="530" rx="35" /><path class="logo-shape" d="M 384 504 C 405 470, 431 445, 460 445 C 483 445, 501 455, 512 477 C 523 455, 541 445, 564 445 C 593 445, 619 470, 640 504 L 640 584 L 384 584 Z" />`;

/* ---------- Markup ---------- */

const navbarHTML = `
<header class="navbar" id="site-navbar">
  <div class="wrap">
    <a href="${siteUrl("")}" class="nav-logo" aria-label="Humpy Calculator — home">
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Humpy Calculator logo">${logoShapes}</svg>
      </span>
      <span class="nav-logo-text">Humpy Calculator</span>
    </a>

    <nav class="nav-center" id="nav-center">
      <a href="${siteUrl("")}" class="nav-link" data-page="index"><span class="nav-text" data-text="Home">Home</span></a>
      <div class="nav-item" id="calculators-item">
        <button class="nav-link nav-link-btn" id="calculators-toggle" aria-expanded="false" aria-haspopup="true">
          <span class="nav-text" data-text="Calculators">Calculators</span>${caret}
        </button>
        <div class="nav-dropdown">${SITE.nav.map((key) => `<a href="${siteUrl(`calculators/${key}/`)}">${CATEGORY_LABELS[key]}</a>`).join("")}</div>
      </div>
      <a href="${siteUrl("about/")}" class="nav-link" data-page="about"><span class="nav-text" data-text="About">About</span></a>
    </nav>

    <div class="nav-right">
      <div class="theme-picker" id="theme-picker">
        <button class="theme-btn" id="theme-toggle" aria-expanded="false" aria-haspopup="true">
          <span class="theme-dot" id="theme-dot"></span>
          <span class="theme-btn-label">Theme</span>${caret}
        </button>
        <div class="theme-dropdown" id="theme-dropdown">
          ${SITE.themes.map((t) => `
          <button class="theme-option" data-value="${t.value}" title="${t.label}" aria-label="${t.label}">
            <span class="swatch" data-color="${t.color}"></span>
            <span class="theme-option-label">${t.label}</span>
          </button>`).join("")}
          <button class="theme-option theme-mode-option" id="mode-toggle" type="button">Dark mode</button>
        </div>
      </div>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
    </div>
  </div>
</header>`;

// Social icons (addresses come from SITE.social in site-config.js). Only "#" or https:// links are accepted.
const SOCIAL_ICONS = {
  facebook: { label: "Facebook", svg: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.3v3h2.5V21h2.7z"></path></svg>` },
  instagram: { label: "Instagram", svg: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"></circle><circle cx="17.2" cy="6.8" r="1.1"></circle></svg>` },
};
const socialHTML = Object.entries(SITE.social || {})
  .filter(([name, url]) => url && SOCIAL_ICONS[name])
  .map(([name, url]) => {
    const live = /^https:\/\//i.test(url);
    const attrs = live ? `href="${url.replace(/"/g, "%22")}" target="_blank" rel="noopener noreferrer"` : `href="#" data-pending="true"`;
    return `<a ${attrs} class="social-link" aria-label="${SOCIAL_ICONS[name].label}">${SOCIAL_ICONS[name].svg}</a>`;
  })
  .join("");

// Footer: edit developers and contact e-mail here. Social icons: edit SITE.social in site-config.js.
const footerHTML = `
<footer class="site-footer">
  <div class="footer-glyphs" aria-hidden="true">
    <span class="g1">π</span><span class="g2">Σ</span><span class="g3">√</span>
    <span class="g4">∞</span><span class="g5">÷</span>
  </div>

  <div class="footer-container">
    <div class="footer-brand-col">
      <div class="footer-brand">
        <span class="brand-logo" aria-hidden="true"><svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${logoShapes}</svg></span>
        <span>Humpy Calculator</span>
      </div>
      <p class="footer-description">From math to science, making everyday numbers easier for everyone.</p>
    </div>

    <div class="developers-col">
      <h2 class="footer-heading">Meet the developers</h2>
      <ul class="developers">
        <li class="developer-chip"><span class="developer-avatar">H</span>Hamza</li>
        <li class="developer-chip"><span class="developer-avatar">M</span>Muhaimin</li>
        <li class="developer-chip"><span class="developer-avatar">A</span>Ahmad</li>
      </ul>
    </div>

    <div class="contact-col">
      <h2 class="footer-heading">Contact</h2>
      <a class="contact-mail" href="https://mail.google.com/mail/?view=cm&fs=1&to=humpycalculator%40gmail.com" target="_blank" rel="noopener noreferrer">
        <span class="mail-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>
        </span>
        <span>humpycalculator@gmail.com</span>
      </a>
      ${socialHTML ? `<div class="social-links">${socialHTML}</div>` : ""}
    </div>
  </div>

  <div class="footer-bottom">
    <p class="copyright">&copy; <span id="copyright-year"></span> Humpy Calculator</p>
    <nav class="footer-links" aria-label="Legal and contact">
      <a href="${siteUrl("privacy/")}" class="footer-link">Privacy Policy</a>
      <a href="${siteUrl("terms/")}" class="footer-link">Terms of Use</a>
      <a href="${siteUrl("contact/")}" class="footer-link">Contact</a>
    </nav>
    <button type="button" class="back-to-top" id="back-to-top">
      <span>Back to top</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"></path><path d="M6 11l6-6 6 6"></path></svg>
    </button>
  </div>
</footer>`;

/* ---------- Inject ---------- */
document.getElementById("site-header").outerHTML = navbarHTML;
document.getElementById("site-footer").outerHTML = footerHTML;

// Icons whose link is not ready yet (href="#") must not jump the page to the top.
document.querySelectorAll('.social-link[data-pending]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

// Swatch colours are set from JS (the strict Content-Security-Policy forbids style="" attributes in markup).
document.querySelectorAll(".swatch").forEach((s) => (s.style.background = s.dataset.color));

/* ---------- Navbar behaviour ---------- */
const $ = (id) => document.getElementById(id);
const navbar = $("site-navbar");
const calcItem = $("calculators-item");
const calcToggle = $("calculators-toggle");
const themePicker = $("theme-picker");
const themeToggle = $("theme-toggle");

const setOpen = (box, btn, open) => {
  box.classList.toggle("is-open", open);
  btn.setAttribute("aria-expanded", String(open));
};
const toggleOpen = (box, btn) => setOpen(box, btn, !box.classList.contains("is-open"));

// "Calculators" dropdown: opens on hover with a mouse, on tap with touch.
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
let calcCloseTimer = null;
const cancelCalcClose = () => { clearTimeout(calcCloseTimer); calcCloseTimer = null; };

calcItem.addEventListener("mouseenter", () => {
  if (!canHover.matches) return;
  cancelCalcClose();
  setOpen(calcItem, calcToggle, true);
});
calcItem.addEventListener("mouseleave", () => {
  if (!canHover.matches) return;
  cancelCalcClose();
  calcCloseTimer = setTimeout(() => { setOpen(calcItem, calcToggle, false); calcCloseTimer = null; }, 150);
});
calcToggle.onclick = () => {
  cancelCalcClose();
  if (canHover.matches) setOpen(calcItem, calcToggle, true);
  else toggleOpen(calcItem, calcToggle);
};
$("nav-toggle").onclick = () => toggleOpen(navbar, $("nav-toggle"));
themeToggle.onclick = () => toggleOpen(themePicker, themeToggle);

// Click anywhere else closes both dropdowns; Escape closes the Calculators one.
document.addEventListener("click", (e) => {
  [[calcItem, calcToggle], [themePicker, themeToggle]].forEach(([box, btn]) => {
    if (box.contains(e.target)) return;
    if (box === calcItem) cancelCalcClose();
    box.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { cancelCalcClose(); setOpen(calcItem, calcToggle, false); }
});

/* ---------- Preferences: colour theme + light/dark mode (saved in localStorage) ---------- */
const savePref = (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} };
const readPref = (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } };

function setTheme(value) {
  document.documentElement.dataset.theme = value;
  savePref("theme", value);
  document.querySelectorAll(".theme-option[data-value]").forEach((b) => b.classList.toggle("is-active", b.dataset.value === value));
  const color = (SITE.themes.find((t) => t.value === value) || SITE.themes[0]).color;
  $("theme-dot").style.background = color;
  // The browser-tab icon follows the theme colour.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><path d="M15 13h8v38h-8zM41 13h8v38h-8zM22 29c2-5 5-8 10-8s8 3 10 8v8H22z" fill="#fff"/></svg>`;
  let icon = document.querySelector('link[rel~="icon"]');
  if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
  icon.type = "image/svg+xml";
  icon.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function setMode(value) {
  document.documentElement.dataset.mode = value;
  savePref("mode", value);
  $("mode-toggle").textContent = value === "dark" ? "Light mode" : "Dark mode";
}

document.querySelectorAll(".theme-option[data-value]").forEach((b) => {
  b.onclick = () => { setTheme(b.dataset.value); toggleOpen(themePicker, themeToggle); };
});
$("mode-toggle").onclick = () => setMode(document.documentElement.dataset.mode === "dark" ? "light" : "dark");

// Restore saved choices. SECURITY: stored values are checked against the allowed lists before use.
const savedTheme = readPref("theme");
const savedMode = readPref("mode");
setTheme(SITE.themes.some((t) => t.value === savedTheme) ? savedTheme : "blue");
setMode(savedMode === "dark" ? "dark" : "light");

/* ---------- Footer behaviour ---------- */
$("copyright-year").textContent = new Date().getFullYear();

// "Back to top": hidden near the top, fades in after 300px, scrolls up with our own easing animation.
const backToTop = $("back-to-top");
const html = document.documentElement;
const getY = () => window.pageYOffset || html.scrollTop || document.body.scrollTop || 0;
let rafId = null;
let savedBehavior = "";

const updateVisibility = () => backToTop.classList.toggle("is-visible", getY() > 300);
["scroll", "resize", "pageshow"].forEach((evt) => window.addEventListener(evt, updateVisibility, evt === "scroll" ? { passive: true } : undefined));
updateVisibility();

const stopAnimation = () => {
  if (rafId === null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
  html.style.scrollBehavior = savedBehavior;
};
// If the visitor scrolls or touches mid-animation, hand control back to them.
["wheel", "touchstart", "mousedown"].forEach((evt) => window.addEventListener(evt, stopAnimation, { passive: true }));

backToTop.addEventListener("click", (event) => {
  event.preventDefault();
  stopAnimation();
  const start = getY();
  if (start <= 0) return;
  const duration = Math.min(1100, Math.max(450, start * 0.35));
  const startTime = performance.now();
  savedBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto"; // stop CSS smooth-scroll fighting every frame
  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    window.scrollTo(0, start * (1 - eased));
    if (t < 1) rafId = requestAnimationFrame(step);
    else { rafId = null; html.style.scrollBehavior = savedBehavior; window.scrollTo(0, 0); }
  };
  rafId = requestAnimationFrame(step);
});


/* ---------- Highlight the current page in the navbar ---------- */
const rootPath = new URL(SITE_ROOT).pathname;
const currentPage = location.pathname.slice(rootPath.length).replace(/\/?(?:index\.html)?$/, "") || "index";
document.querySelectorAll(".nav-center a.nav-link").forEach((a) => a.classList.toggle("is-active", a.dataset.page === currentPage));
if (currentPage.startsWith("calculators/")) calcToggle.classList.add("is-active");
document.querySelectorAll(".nav-dropdown a").forEach((a) => {
  const current = currentPage === "calculators/" + a.textContent.trim().toLowerCase();
  a.classList.toggle("is-current", current);
  if (current) a.setAttribute("aria-current", "page");
});
