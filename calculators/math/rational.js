/* =====================================================================
   rational.js — exact fraction arithmetic (BigInt) for the Math calculators.
   Why: 0.1 + 0.2 should be exactly 0.3, not 0.30000000000000004. Values are stored as a
   fraction { n, d } (numerator / denominator, both BigInt) and only rounded when displayed.
   Used by math.js and gpa.js.  Needs: utils.js
   ===================================================================== */

const MATH_DECIMALS = 4;   // results show at most 4 decimal places
const MATH_BIG_LIMIT = 400; // beyond this many digits we fall back to ordinary floating point

const bigAbs = (x) => (x < 0n ? -x : x);
const bigGcd = (a, b) => { a = bigAbs(a); b = bigAbs(b); while (b) [a, b] = [b, a % b]; return a || 1n; };

// Q = "rational number" toolbox. Every function returns a new reduced fraction.
const Q = {
  make(n, d = 1n) {
    if (d === 0n) throw new Error("Division by zero.");
    if (d < 0n) { n = -n; d = -d; }
    const g = bigGcd(n, d);
    return { n: n / g, d: d / g };
  },
  // The exact value of a JS number as typed (its shortest decimal form, so 0.1 -> 1/10).
  from(value) {
    const x = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(x)) throw new Error("Value must be a finite number.");
    const m = String(x).match(/^([+-]?)(\d*)\.?(\d*)(?:e([+-]?\d+))?$/i);
    if (!m) throw new Error("Value must be a valid number.");
    const frac = m[3] || "";
    const exp = (m[4] ? parseInt(m[4], 10) : 0) - frac.length;
    let n = BigInt((m[2] || "0") + frac);
    let d = 1n;
    if (exp >= 0) n *= 10n ** BigInt(exp); else d = 10n ** BigInt(-exp);
    return Q.make(m[1] === "-" ? -n : n, d);
  },
  add: (a, b) => Q.make(a.n * b.d + b.n * a.d, a.d * b.d),
  sub: (a, b) => Q.make(a.n * b.d - b.n * a.d, a.d * b.d),
  mul: (a, b) => Q.make(a.n * b.n, a.d * b.d),
  div(a, b) { if (b.n === 0n) throw new Error("Division by zero."); return Q.make(a.n * b.d, a.d * b.n); },
  neg: (a) => ({ n: -a.n, d: a.d }),
  isZero: (a) => a.n === 0n,
  isInt: (a) => a.d === 1n,
  sign: (a) => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0),
  cmp: (a, b) => { const x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; },
  pow(a, e) { // e is an integer Number
    if (e >= 0) return Q.make(a.n ** BigInt(e), a.d ** BigInt(e));
    if (a.n === 0n) throw new Error("Zero cannot be raised to a negative power.");
    return Q.make(a.d ** BigInt(-e), a.n ** BigInt(-e));
  },
  toNumber(a) { // fraction -> JS number (scales huge parts down together so the ratio stays accurate)
    const big = BigInt(Number.MAX_SAFE_INTEGER);
    if (bigAbs(a.n) < big && a.d < big) return Number(a.n) / Number(a.d);
    const s = Math.max(a.n.toString().length, a.d.toString().length) - 300;
    if (s > 0) return Number(a.n / 10n ** BigInt(s)) / Number(a.d / 10n ** BigInt(s));
    return Number(a.n) / Number(a.d);
  },
};

const sumQ = (list) => list.reduce((acc, q) => Q.add(acc, q), Q.make(0n));
const toQ = (value, label) => Q.from(assertNumber(value, label)); // validated user number -> fraction

/* ---------- Display ---------- */

const groupDigits = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Exact decimal text rounded half-away-from-zero at `dp` places, trailing zeros removed: 1234.5 -> "1,234.5".
function formatRat(r, dp = MATH_DECIMALS) {
  const neg = r.n < 0n;
  const n = bigAbs(r.n);
  const p = 10n ** BigInt(dp);
  const scaled = (n * p * 2n + r.d) / (2n * r.d);
  const intPart = (scaled / p).toString();
  const fracPart = (scaled % p).toString().padStart(dp, "0").replace(/0+$/, "");
  return (neg && scaled !== 0n ? "-" : "") + groupDigits(intPart) + (fracPart ? "." + fracPart : "");
}

// A JS number with at most 4 decimals and no trailing zeros (very large/small -> e-notation).
function formatMath(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 1e21 || abs < 0.00005) return x.toExponential(MATH_DECIMALS).replace(/\.?0+e/, "e").replace("e+", "e");
  return formatRat(Q.from(x));
}

const fracText = (r) => `${r.n < 0n ? "-" : ""}${bigAbs(r.n)}/${r.d}`;
const terminates = (r) => (r.n * 10n ** BigInt(MATH_DECIMALS)) % r.d === 0n; // decimal form needs no rounding

// Friendly text for a fraction: integers as-is, "28/3 ≈ 9.3333", or "5/2 = 2.5" when forceFraction is set.
function showQ(r, forceFraction = false) {
  if (Q.isInt(r)) return formatRat(r);
  if (r.n.toString().length > MATH_BIG_LIMIT || r.d.toString().length > MATH_BIG_LIMIT) return formatRat(r);
  const dec = formatRat(r);
  if (terminates(r)) return forceFraction ? `${fracText(r)} = ${dec}` : dec;
  // A denominator made only of 2s and 5s is a long terminating decimal (e.g. 0.333333) — show it rounded.
  let rest = r.d;
  while (rest % 2n === 0n) rest /= 2n;
  while (rest % 5n === 0n) rest /= 5n;
  const approx = dec === "0" ? formatMath(Q.toNumber(r)) : dec;
  return rest === 1n ? `≈ ${approx}` : `${fracText(r)} ≈ ${approx}`;
}

/* ---------- Square roots ---------- */

// Exact floor(√n) for a BigInt (Newton's method, starts above the answer so it only ever steps down).
// SECURITY: the old version walked down one-by-one from a float guess, which froze the tab for numbers near 1e308.
const isqrtBig = (n) => {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1); // 2^ceil(bits/2) >= √n
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
};

// √n for a non-negative integer BigInt -> { outside, inside } where √n = outside·√inside  (e.g. √72 = 6√2)
function simplifyRadical(n) {
  if (n > 10n ** 12n) return null;
  let outside = 1n, inside = n;
  for (let i = 2n; i * i <= inside; i++) {
    while (inside % (i * i) === 0n) { inside /= i * i; outside *= i; }
  }
  return { outside, inside };
}

// "3x + 4 = 19" style text for the algebra solver.
function linearText(a, b, c) {
  const f = (r) => formatRat(r);
  let left;
  if (Q.cmp(a, Q.make(1n)) === 0) left = "x";
  else if (Q.cmp(a, Q.make(-1n)) === 0) left = "−x";
  else left = `${f(a)}x`;
  if (!Q.isZero(b)) left += Q.sign(b) < 0 ? ` − ${f(Q.neg(b))}` : ` + ${f(b)}`;
  return `${left} = ${f(c)}`;
}
