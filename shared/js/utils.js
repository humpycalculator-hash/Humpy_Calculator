/* =====================================================================
   utils.js — small helpers shared by every page.
     1. Number formatting      (formatNumber, formatCurrency)
     2. Input validation       (assertNumber, nonNegative, positive, isBlank)
     3. Safe lookups + HTML    (own, escapeHtml, sanitizeHtml)   <-- SECURITY
     4. Field builders         (numField, textField, selectField, opts)
   Loaded as a normal <script>, so everything here is a global.
   ===================================================================== */

/* ---------- 1. Number formatting ---------- */

// 1234567.891 -> "1,234,567.891"; huge/tiny numbers -> "1.5e12" (never rounds tiny values to 0).
const formatNumber = (n, maxDecimals = 4) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const digits = Math.min(4, Math.max(0, maxDecimals));
  if (n !== 0 && (Math.abs(n) >= 1e12 || Math.abs(n) < 1e-4)) {
    const [mantissa, exponent] = n.toExponential(digits).split("e");
    return `${mantissa.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1")}e${Number(exponent)}`;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, useGrouping: true }).format(n);
};

// Money with a currency symbol and always 2 decimals: formatCurrency(1500, "USD") -> "$1,500.00"
const CURRENCY_SYMBOLS = { PKR: "Rs ", USD: "$", GBP: "£", EUR: "€", INR: "₹", AED: "د.إ " };
const formatCurrency = (value, currency = "PKR") => {
  const symbol = Object.hasOwn(CURRENCY_SYMBOLS, currency) ? CURRENCY_SYMBOLS[currency] : `${currency} `;
  const amount = Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(value)
    : "—";
  return symbol + amount;
};

/* ---------- 2. Input validation (each throws an Error whose message is shown to the user) ---------- */

const isBlank = (n) => n === undefined || n === null || n === "" || Number.isNaN(n);

// Returns `value` as a finite number inside [min, max] or throws a friendly error.
const assertNumber = (value, label, { min = -Infinity, max = Infinity } = {}) => {
  if (value === "" || value === null || value === undefined) throw new Error(`${label} is required.`);
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number.`);
  if (n < min) throw new Error(`${label} must be at least ${formatNumber(min)}.`);
  if (n > max) throw new Error(`${label} must be at most ${formatNumber(max)}.`);
  return n;
};
const nonNegative = (value, label) => assertNumber(value, label, { min: 0 });
const positive = (value, label) => {
  const n = assertNumber(value, label);
  if (n <= 0) throw new Error(`${label} must be greater than zero.`);
  return n;
};

/* ---------- 3. Safe lookups + safe HTML ---------- */

// Look a key up in a table WITHOUT reaching inherited keys like "constructor" or "__proto__".
const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

// Turn text into HTML-safe text. Use for ANY text a visitor typed.
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Safe-HTML filter used on everything we put into the page with innerHTML.
// Only <br>, <strong> and </strong> (written by our own calculators) and already-escaped entities
// survive; every other "<", ">" or "&" is escaped, so injected tags such as <img onerror=...> become plain text.
const sanitizeHtml = (s) =>
  String(s).replace(/<\/?(?:br|strong)>|&(?:amp|lt|gt|quot|#39);|[&<>]/g, (m) =>
    m.length > 1 ? m : { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]);

/* ---------- 4. Field builders (keep calculator definitions short) ---------- */

const numField = (id, label, placeholder, extra = {}) => ({ id, label, type: "number", placeholder, ...extra });
const textField = (id, label, placeholder, extra = {}) => ({ id, label, type: "text", placeholder, ...extra });
const selectField = (id, label, options, extra = {}) => ({ id, label, type: "select", options, ...extra });
// opts(["m", "Meter (m)"], ["km", "Kilometer (km)"]) -> [{value:"m",label:"Meter (m)"}, ...]
const opts = (...pairs) => pairs.map(([value, label]) => ({ value, label }));
