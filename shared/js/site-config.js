/* =====================================================================
   site-config.js — the single list of categories and colour themes.
   Navbar, "Related calculators" and the Formulas page all read from here.
   (Adding a calculator category? See README.md -> "Add a new calculator page".)
   ===================================================================== */
const SITE = {
  // [folder name under /calculators/, label]. Order = order on the Formulas page and in "Related calculators".
  categories: [
    ["math", "Math"],
    ["finance", "Finance"],
    ["physics", "Physics"],
    ["chemistry", "Chemistry"],
    ["conversion", "Conversion"],
    ["health", "Health"],
  ],

  // Order of the links inside the navbar "Calculators" dropdown.
  nav: ["math", "conversion", "finance", "physics", "chemistry", "health"],

  // Footer social icons. ONE place to edit them.
  //   "#"  = icon is shown but the link is not ready yet (clicking does nothing).
  //   "https://..." = the real page address. Paste it here and the icon goes live on every page.
  //   ""   = hide that icon completely.
  social: {
    facebook: "#",
    instagram: "#",
  },

  // Colour themes. `value` must match a :root[data-theme="..."] block in shared/css/base.css.
  themes: [
    { value: "blue",          label: "Blue",          color: "#004ac6" },
    { value: "dark-green",    label: "Dark Green",    color: "#166534" },
    { value: "cosmic-orange", label: "Cosmic Orange", color: "#c2410c" },
    { value: "burgundy",      label: "Burgundy",      color: "#800020" },
    { value: "yellow",        label: "Yellow",        color: "#b78600" },
    { value: "plum",          label: "Deep Plum",     color: "#36013f" },
  ],
};

// Each calculators/<name>/<name>.js file registers itself here: CATEGORIES.<name> = { subcategories: {...} }.
// One entry in `subcategories` = one calculator in that page's "Select operation" dropdown.
const CATEGORIES = {};
