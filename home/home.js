/* =====================================================================
   home.js — "More to explore" fan-style carousel on the Home page (index.html).
   Reads the markup in index.html (#stage, #caption …) and builds one tile per entry of ITEMS.
   To add / remove / reorder a tile: edit ITEMS below (links are relative to the site root).
   ===================================================================== */

// One entry per tile: name, caption text, link, button text and an SVG icon (64×64 viewBox).
const ITEMS = [
  {
    name: "Math",
    text: "Percentages, fractions, equations and more, with the steps shown.",
    href: "calculators/math/",
    cta: "Open Math calculators",
    icon: `<path d="M47 11H19l16 21-16 21h28" stroke-width="7" stroke-linejoin="round"/>`,
  },
  {
    name: "Formulas & Definitions",
    text: "Every formula we use, in one reference page.",
    href: "formulas/",
    cta: "View formulas",
    icon: `
      <mask id="cut-formulas">
        <rect width="64" height="64" fill="#fff"/>
        <rect x="14" y="10" width="46" height="34" rx="8" fill="#000"/>
      </mask>
      <rect x="6" y="24" width="38" height="28" rx="6" transform="rotate(-14 25 38)" mask="url(#cut-formulas)"/>
      <rect x="18" y="14" width="40" height="26" rx="5"/>
      <path d="M25 28l3 4 5-12h11"/>
      <path d="M38 24l7 9M45 24l-7 9" stroke-width="3"/>`,
  },
  {
    name: "Finance",
    text: "Interest, loans, profit and margin, worked out step by step.",
    href: "calculators/finance/",
    cta: "Open Finance calculators",
    icon: `
      <path d="M9 40V16a4 4 0 0 1 4-4h34"/>
      <rect x="17" y="22" width="40" height="28" rx="4"/>
      <circle cx="37" cy="36" r="6.5"/>
      <circle class="solid" cx="24" cy="36" r="1.8"/>
      <circle class="solid" cx="50" cy="36" r="1.8"/>`,
  },
  {
    name: "Physics",
    text: "Motion, force, energy and electricity problems, solved with units.",
    href: "calculators/physics/",
    cta: "Open Physics calculators",
    icon: `
      <g transform="scale(2.6667)" stroke-width="1.5">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        <circle cx="16" cy="8" r="1.3"/>
      </g>`,
  },
  {
    name: "Chemistry",
    text: "Molar mass, concentration and balancing, made simple.",
    href: "calculators/chemistry/",
    cta: "Open Chemistry calculators",
    icon: `
      <path d="M24 7h16"/>
      <path d="M27 7v19L10 51a4 4 0 0 0 3.4 6.5h37.2A4 4 0 0 0 54 51L37 26V7"/>
      <path d="M17 42h30"/>`,
  },
  {
    name: "Health",
    text: "BMI, calories and body metrics, in plain numbers.",
    href: "calculators/health/",
    cta: "Open Health calculators",
    icon: `<path class="solid" d="M32 56s-16-9.5-16-21a9 9 0 0 1 16-5 9 9 0 0 1 16 5c0 11.5-16 21-16 21z"/>`,
  },
  {
    name: "Unit Converters",
    text: "Length, weight, temperature and more, converted instantly.",
    href: "calculators/conversion/",
    cta: "Open Unit Converters",
    icon: `
      <path d="M9 22h44M43 11l11 11-11 11"/>
      <path d="M55 42H11M21 31 10 42l11 11"/>`,
  },
];

/* ---------- Element references ---------- */
const stage        = document.getElementById("stage");
const carousel     = document.getElementById("carousel");
const caption      = document.getElementById("caption");
const captionTitle = document.getElementById("caption-title");
const captionText  = document.getElementById("caption-text");
const captionLink  = document.getElementById("caption-link");

const total = ITEMS.length;
let active = 0;       // index of the tile in the centre
let swapTimer = null; // pending caption swap

/* ---------- Build the tiles ---------- */
const tiles = ITEMS.map((item, i) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tile";
  btn.setAttribute("aria-label", item.name);
  btn.innerHTML = item.name === "Health"
    ? '<img class="health-tile-image" src="assets/health-icon.png" alt="" aria-hidden="true">'
    : `<svg viewBox="0 0 64 64" aria-hidden="true">${item.icon}</svg>`;
  btn.addEventListener("click", () => goTo(i));
  stage.appendChild(btn);
  return btn;
});

// Give every tile its distance from the centre tile (data-offset); the CSS positions tiles from that.
function layout() {
  tiles.forEach((tile, i) => {
    let d = i - active;
    if (d > total / 2) d -= total;   // take the short way round the circle
    if (d < -total / 2) d += total;
    tile.dataset.offset = d;
    tile.tabIndex = d === 0 ? 0 : -1;
    tile.setAttribute("aria-current", d === 0 ? "true" : "false");
  });
}

// Show the active tile's text; non-immediate swaps fade out first.
function setCaption(immediate) {
  const item = ITEMS[active];
  const apply = () => {
    captionTitle.textContent = item.name;
    captionText.textContent = item.text;
    captionLink.textContent = item.cta;
    captionLink.href = item.href;
    caption.classList.remove("is-changing");
  };
  clearTimeout(swapTimer);
  if (immediate) return apply();
  caption.classList.add("is-changing");
  swapTimer = setTimeout(apply, 180);
}

// Soft "whoosh" while sliding (optional: silently skipped if the browser blocks audio).
let audioContext = null;
function playSlideSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = audioContext || new AudioCtx();
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch (_) { /* audio is optional */ }
}

function goTo(index) {
  const nextIndex = (index + total) % total;
  if (nextIndex === active) return;
  active = nextIndex;
  stage.classList.remove("is-sliding");
  void stage.offsetWidth; // restart the CSS slide animation
  stage.classList.add("is-sliding");
  setTimeout(() => stage.classList.remove("is-sliding"), 450);
  playSlideSound();
  layout();
  setCaption(false);
}
const next = () => goTo(active + 1);
const prev = () => goTo(active - 1);

/* ---------- Controls: buttons, arrow keys, swipe ---------- */
document.getElementById("next").addEventListener("click", next);
document.getElementById("prev").addEventListener("click", prev);

carousel.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { next(); tiles[active].focus(); }
  if (e.key === "ArrowLeft") { prev(); tiles[active].focus(); }
});

let startX = null;
stage.addEventListener("pointerdown", (e) => { startX = e.clientX; });
stage.addEventListener("pointerup", (e) => {
  if (startX === null) return;
  const dx = e.clientX - startX;
  startX = null;
  if (Math.abs(dx) > 45) dx < 0 ? next() : prev(); // swipe left = next
});
stage.addEventListener("pointercancel", () => { startX = null; });

layout();
setCaption(true);
