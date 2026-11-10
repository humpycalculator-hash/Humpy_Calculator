/* =====================================================================
   math.js — every calculator on the Math page.
   To ADD one: copy a block, give it a new key, change fields + calculate().
   To REMOVE one: delete its block.
   Maths runs on exact fractions (see rational.js), so 0.1 + 0.2 is exactly 0.3.
   The GPA / SGPA / CGPA screens live in gpa.js.
   Needs (load before): utils.js, rational.js, gpa.js
   ===================================================================== */
(() => {
  CATEGORIES.math = {
    subcategories: {
      percentage: {
        label: "Percentage",
        resultLabel: "Result",
        formula: "Result = (Percentage ÷ 100) × Value",
        definition: "Finds what a given percentage of a value equals.",
        fields: [
          numField("part", "Percentage (%)", "e.g. 20"),
          numField("whole", "Of value", "e.g. 150"),
        ],
        calculate: (v) => {
          const part  = toQ(v.part, "Percentage");
          const whole = toQ(v.whole, "Value");
          const frac = Q.div(part, Q.make(100n));
          const result = Q.mul(frac, whole);
          return {
            result: showQ(result),
            steps: [
              `${showQ(part)}% → ${showQ(part)} ÷ 100 = ${showQ(frac)}`,
              `${showQ(frac)} × ${showQ(whole)} = ${showQ(result)}`,
            ],
          };
        },
      },

      "square-root": {
        label: "Square Root",
        resultLabel: "√n",
        formula: "Result = √n",
        definition: "Finds the number that, multiplied by itself, gives n.",
        fields: [numField("n", "Number", "e.g. 144")],
        calculate: (v) => {
          const nQ = toQ(v.n, "Number");
          if (Q.sign(nQ) < 0) throw new Error("Negative numbers have no real square root.");
          const n = Q.toNumber(nQ);
          const rootNum = isqrtBig(nQ.n), rootDen = isqrtBig(nQ.d);
          const nShown = showQ(nQ);
          // Perfect square (integer or fraction): exact answer
          if (rootNum * rootNum === nQ.n && rootDen * rootDen === nQ.d) {
            const r = Q.make(rootNum, rootDen);
            return {
              result: showQ(r, true),
              steps: [
                `√${nShown} = ${showQ(r, true)}`,
                `Check: ${showQ(r)} × ${showQ(r)} = ${nShown}`,
              ],
            };
          }
          const approx = Math.sqrt(n);
          const rad = Q.isInt(nQ) ? simplifyRadical(nQ.n) : null;
          if (rad && rad.outside > 1n) {
            const exact = `${rad.outside}√${rad.inside}`;
            return {
              result: `${exact} ≈ ${formatMath(approx)}`,
              steps: [
                `√${nShown} = √(${rad.outside * rad.outside} × ${rad.inside}) = ${exact}`,
                `${exact} ≈ ${formatMath(approx)}`,
                `Check: ${formatMath(approx)} × ${formatMath(approx)} ≈ ${nShown}`,
              ],
            };
          }
          return {
            result: Q.isInt(nQ) ? `√${nShown} ≈ ${formatMath(approx)}` : formatMath(approx),
            steps: [
              `√${nShown} ≈ ${formatMath(approx)}`,
              `Check: ${formatMath(approx)} × ${formatMath(approx)} ≈ ${nShown}`,
            ],
          };
        },
      },

      exponent: {
        label: "Exponent",
        resultLabel: "base^exponent",
        formula: "Result = base^exponent",
        definition: "Multiplies a base number by itself exponent times.",
        fields: [
          numField("base", "Base", "e.g. 2"),
          numField("exp", "Exponent", "e.g. 10"),
        ],
        calculate: (v) => {
          const base = assertNumber(v.base, "Base");
          const exp  = assertNumber(v.exp,  "Exponent");
          const bQ = Q.from(base);
          const bShown = base < 0 ? `(${formatMath(base)})` : formatMath(base);
          const label = `${bShown}^${formatMath(exp)}`;
          const steps = [];
          let resultText;

          if (base === 0 && exp < 0) throw new Error("0 cannot be raised to a negative power (that would divide by zero).");
          if (base < 0 && !Number.isInteger(exp)) throw new Error("A negative base with a non-whole exponent has no real result.");

          const digits = Math.abs(exp) * Math.max(bQ.n.toString().length, bQ.d.toString().length);
          if (Number.isInteger(exp) && Math.abs(exp) <= 1000 && digits <= MATH_BIG_LIMIT) {
            const r = Q.pow(bQ, exp);
            if (exp === 0) steps.push(`Any non-zero number to the power 0 is 1${base === 0 ? " (0⁰ is taken as 1)" : ""}`);
            else if (exp > 0 && exp <= 6) steps.push(`${label} = ${Array(exp).fill(bShown).join(" × ")}`);
            else if (exp > 0) steps.push(`${label} means ${bShown} used as a factor ${formatMath(exp)} times`);
            else steps.push(`${label} = 1 ÷ ${bShown}^${formatMath(-exp)}`);
            resultText = showQ(r, exp < 0);
            steps.push(`Result = ${resultText}`);
          } else {
            const result = Math.pow(base, exp);
            if (!Number.isFinite(result)) throw new Error("Result is too large to display.");
            steps.push(Number.isInteger(exp) ? `${label} computed with floating-point arithmetic` : `${label} = e^(${formatMath(exp)} × ln ${bShown}) (fractional exponent)`);
            resultText = formatMath(result);
            steps.push(`Result ≈ ${resultText}`);
          }
          return { result: resultText, unit: "", steps };
        },
      },

      logarithm: {
        label: "Log",
        resultLabel: "log_base(x)",
        formula: "Result = ln(x) ÷ ln(base)",
        definition: "Finds the power the base must be raised to reach x.",
        fields: [
          numField("x", "x", "e.g. 1000"),
          numField("base", "Base", "e.g. 10"),
        ],
        calculate: (v) => {
          const x = assertNumber(v.x, "x");
          const base = assertNumber(v.base, "Base");
          if (x <= 0)    throw new Error("x must be greater than zero.");
          if (base <= 0) throw new Error("Base must be greater than zero.");
          if (base === 1) throw new Error("Base cannot be 1.");
          let result = Math.log(x) / Math.log(base);
          if (base === 10) result = Math.log10(x);
          else if (base === 2) result = Math.log2(x);
          const snapped = Math.round(result);
          const exact = Math.abs(result - snapped) < 1e-10 && Math.abs(Math.pow(base, snapped) - x) <= Math.abs(x) * 1e-12;
          if (exact) result = snapped;
          const steps = [
            `ln(${formatMath(x)}) = ${formatMath(Math.log(x))}`,
            `ln(${formatMath(base)}) = ${formatMath(Math.log(base))}`,
            `${formatMath(Math.log(x))} ÷ ${formatMath(Math.log(base))} = ${formatMath(result)}`,
          ];
          if (exact) steps.push(`Check: ${formatMath(base)}^${formatMath(snapped)} = ${formatMath(x)}`);
          return { result: formatMath(result), unit: "", steps };
        },
      },

      "fraction-simplifier": {
        label: "Fraction Simplifier",
        resultLabel: "Simplified fraction",
        formula: "a/b → (a ÷ gcd) / (b ÷ gcd)",
        definition: "Reduces a fraction to its simplest form.",
        fields: [
          numField("num", "Numerator", "e.g. 18"),
          numField("den", "Denominator", "e.g. 24"),
        ],
        calculate: (v) => {
          const qn = toQ(v.num, "Numerator");
          const qd = toQ(v.den, "Denominator");
          if (Q.isZero(qd)) throw new Error("Denominator cannot be zero.");
          const r = Q.div(qn, qd);
          const sn = r.n, sd = r.d;
          const steps = [`Fraction: ${formatRat(qn)}/${formatRat(qd)}`];
          let g;
          if (Q.isInt(qn) && Q.isInt(qd)) {
            g = bigGcd(qn.n, qd.n);
            steps.push(`GCD of ${formatRat(qn)} and ${formatRat(qd)} = ${g}`);
            steps.push(`${formatRat(qn)} ÷ ${g} = ${sn}, ${formatRat(qd)} ÷ ${g} = ${sd}`);
          } else {
            const scale = (qn.d * qd.d) / bigGcd(qn.d, qd.d);
            const sN = Q.mul(qn, Q.make(scale)), sD = Q.mul(qd, Q.make(scale));
            g = bigGcd(sN.n, sD.n);
            steps.push(`Remove decimals: multiply top and bottom by ${scale} → ${sN.n}/${sD.n}`);
            steps.push(`GCD of ${sN.n} and ${sD.n} = ${g}`);
            steps.push(`${sN.n} ÷ ${g} = ${sn}, ${sD.n} ÷ ${g} = ${sd}`);
          }
          const text = sd === 1n ? String(sn) : showQ(r, true);
          const details = [
            { label: "Formula", value: "a/b → (a ÷ gcd) / (b ÷ gcd)" },
            { label: "Simplified fraction", value: sd === 1n ? `${sn}/1` : fracText(r) },
            { label: "Decimal (max 4 places)", value: formatRat(r) },
            { label: "GCD used", value: String(g) },
          ];
          if (sd !== 1n && bigAbs(sn) > sd) {
            const whole = bigAbs(sn) / sd, rem = bigAbs(sn) % sd;
            details.push({ label: "Mixed number", value: `${sn < 0n ? "-" : ""}${whole}${rem ? ` ${rem}/${sd}` : ""}` });
          }
          return { result: text, unit: "", resultText: text, steps, details };
        },
      },

      /* ---- GPA family: separate calculators with a shared, configurable grading scale ---- */
      gpa: {
        label: "GPA Calculator",
        resultLabel: "GPA",
        formula: "GPA = Total Quality Points ÷ Total Credit Hours",
        definition: "Quality points = credit hours × grade points. Add courses, pick grades, and get your GPA.",
        customUI: makeGpaUI("gpa"),
        fields: [],
        calculate: (data) => buildGpaOutput("gpa", data),
      },

      sgpa: {
        label: "SGPA Calculator",
        resultLabel: "SGPA",
        formula: "SGPA = Quality Points of the semester ÷ Credit Hours of the semester",
        definition: "Semester GPA: the GPA of the courses from a single semester only.",
        customUI: makeGpaUI("sgpa"),
        fields: [],
        calculate: (data) => buildGpaOutput("sgpa", data),
      },

      cgpa: {
        label: "CGPA Calculator",
        resultLabel: "CGPA",
        formula: "CGPA = Total Quality Points (all semesters) ÷ Total Credit Hours (all semesters)",
        definition: "Cumulative GPA across several semesters, entered course-wise or as semester totals.",
        customUI: makeGpaUI("cgpa"),
        fields: [],
        calculate: (data) => buildCgpaOutput(data),
      },

      average: {
        label: "Average / Mean",
        resultLabel: "Mean",
        formula: "Mean = (Sum of values) ÷ (Count of values)",
        definition: "The arithmetic mean of a list of numbers.",
        fields: [textField("list", "Numbers (comma-separated)", "e.g. 4, 8, 15, 16, 23", { maxlength: 2000 })],
        calculate: (v) => {
          const tokens = String(v.list || "").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
          if (tokens.length === 0) throw new Error("Enter at least one number.");
          const nums = tokens.map((t) => {
            if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(t)) throw new Error(`"${t}" is not a valid number.`);
            return Q.from(Number(t));
          });
          const sum = sumQ(nums);
          const count = BigInt(nums.length);
          const mean = Q.div(sum, Q.make(count));
          const term = (q) => (Q.sign(q) < 0 ? `(${formatRat(q)})` : formatRat(q));
          const shown = nums.length > 20 ? nums.slice(0, 20).map(term).join(" + ") + " + …" : nums.map(term).join(" + ");
          return {
            result: showQ(mean),
            steps: [
              `Numbers: ${nums.map((q) => formatRat(q)).join(", ")}`,
              `Sum = ${shown} = ${showQ(sum)}`,
              `Count = ${nums.length}`,
              `Mean = ${showQ(sum)} ÷ ${nums.length} = ${showQ(mean)}`,
            ],
          };
        },
      },

      "area-perimeter": {
        label: "Area & Perimeter",
        resultLabel: "Area & Perimeter",
        formula: "Rectangle: A = l×w · Square: A = s² · Circle: A = πr² · Triangle: A = ½×b×h",
        definition: "Area and (where possible) perimeter for common shapes.",
        fields: [
          selectField("shape", "Shape", opts(["rectangle", "Rectangle"], ["square", "Square"], ["circle", "Circle"], ["triangle", "Triangle"])),
          // Labels, placeholders and visibility follow the selected shape (see calculator-page.js)
          { id: "a", label: "Length", type: "number", placeholder: "e.g. 10", dependsOn: "shape", variants: {
            rectangle: { label: "Length", placeholder: "e.g. 10" },
            square:    { label: "Side",   placeholder: "e.g. 6" },
            circle:    { label: "Radius", placeholder: "e.g. 7" },
            triangle:  { label: "Base",   placeholder: "e.g. 8" },
          }},
          { id: "b", label: "Width", type: "number", placeholder: "e.g. 5", dependsOn: "shape", variants: {
            rectangle: { label: "Width",  placeholder: "e.g. 5" },
            square:    { hidden: true },
            circle:    { hidden: true },
            triangle:  { label: "Height", placeholder: "e.g. 6" },
          }},
        ],
        calculate: (v) => {
          const shape = v.shape || "rectangle";
          const f = (q) => showQ(q);
          const piText = (c) => (Q.isInt(c) || terminates(c) ? `${Q.cmp(c, Q.make(1n)) === 0 ? "" : f(c)}π` : `(${fracText(c)})π`);
          const piVal = (c) => formatMath(Q.toNumber(c) * Math.PI);
          let areaText, perimText, steps, formulaA, formulaP, shapeName;

          if (shape === "rectangle") {
            const l = Q.from(assertNumber(v.a, "Length", { min: 0 })), w = Q.from(assertNumber(v.b, "Width", { min: 0 }));
            if (Q.isZero(l) || Q.isZero(w)) throw new Error("Length and width must be greater than zero.");
            const area = Q.mul(l, w), per = Q.mul(Q.make(2n), Q.add(l, w));
            shapeName = "Rectangle"; formulaA = "Area = length × width"; formulaP = "Perimeter = 2 × (length + width)";
            areaText = f(area); perimText = f(per);
            steps = [
              { title: "Formulas", expression: `${formulaA}<br>${formulaP}` },
              { title: "Area", expression: `${f(l)} × ${f(w)} = ${areaText}` },
              { title: "Perimeter", expression: `2 × (${f(l)} + ${f(w)}) = ${perimText}` },
            ];
          } else if (shape === "square") {
            const s = Q.from(assertNumber(v.a, "Side", { min: 0 }));
            if (Q.isZero(s)) throw new Error("Side must be greater than zero.");
            const area = Q.mul(s, s), per = Q.mul(Q.make(4n), s);
            shapeName = "Square"; formulaA = "Area = side²"; formulaP = "Perimeter = 4 × side";
            areaText = f(area); perimText = f(per);
            steps = [
              { title: "Formulas", expression: `${formulaA}<br>${formulaP}` },
              { title: "Area", expression: `${f(s)}² = ${areaText}` },
              { title: "Perimeter", expression: `4 × ${f(s)} = ${perimText}` },
            ];
          } else if (shape === "circle") {
            const r = Q.from(assertNumber(v.a, "Radius", { min: 0 }));
            if (Q.isZero(r)) throw new Error("Radius must be greater than zero.");
            const c2 = Q.mul(r, r), cc = Q.mul(Q.make(2n), r);
            shapeName = "Circle"; formulaA = "Area = π × radius²"; formulaP = "Circumference = 2 × π × radius";
            areaText = `${piText(c2)} ≈ ${piVal(c2)}`; perimText = `${piText(cc)} ≈ ${piVal(cc)}`;
            steps = [
              { title: "Formulas", expression: `${formulaA}<br>${formulaP}` },
              { title: "Area", expression: `π × ${f(r)}² = ${areaText}` },
              { title: "Circumference", expression: `2 × π × ${f(r)} = ${perimText}` },
            ];
          } else if (shape === "triangle") {
            const b = Q.from(assertNumber(v.a, "Base", { min: 0 })), h = Q.from(assertNumber(v.b, "Height", { min: 0 }));
            if (Q.isZero(b) || Q.isZero(h)) throw new Error("Base and height must be greater than zero.");
            const area = Q.mul(Q.make(1n, 2n), Q.mul(b, h));
            shapeName = "Triangle"; formulaA = "Area = ½ × base × height"; formulaP = "Perimeter = side₁ + side₂ + side₃";
            areaText = f(area); perimText = "needs all three side lengths";
            steps = [
              { title: "Formula", expression: formulaA },
              { title: "Area", expression: `½ × ${f(b)} × ${f(h)} = ${areaText}` },
              { title: "Perimeter", expression: "A triangle's perimeter needs all three side lengths; base and height alone are not enough." },
            ];
          } else {
            throw new Error("Please choose a shape.");
          }
          const perimName = shape === "circle" ? "Circumference" : "Perimeter";
          return {
            result: areaText,
            resultText: `Area: ${areaText}<br>${perimName}: ${perimText}`,
            steps,
            details: [
              { label: "Shape", value: shapeName },
              { label: "Area formula", value: formulaA },
              { label: `${perimName} formula`, value: formulaP },
              { label: "Area", value: areaText },
              { label: perimName, value: perimText },
            ],
          };
        },
      },

      "algebra-linear": {
        label: "Algebra Equation Solver",
        resultLabel: "x",
        formula: "Solve: a·x + b = c",
        definition: "Solves a single linear equation for x.",
        fields: [
          numField("a", "a — coefficient of x", "e.g. 3"),
          numField("b", "b — constant added to ax", "e.g. 4"),
          numField("c", "c — right-hand side", "e.g. 19", { hint: "Equation form: a·x + b = c" }),
        ],
        calculate: (v) => {
          const a = toQ(v.a, "Coefficient a");
          const b = toQ(v.b, "Constant b");
          const c = toQ(v.c, "Constant c");
          const eq = linearText(a, b, c);
          const base = [
            { label: "Equation form", value: "a·x + b = c" },
            { label: "Your equation", value: eq },
            { label: "Formula", value: "x = (c − b) ÷ a" },
          ];

          if (Q.isZero(a)) {
            const same = Q.cmp(b, c) === 0;
            return {
              result: same ? "Infinitely many solutions" : "No solution",
              resultText: same ? "Infinitely many solutions" : "No solution",
              steps: [
                { title: "Equation", expression: `${formatRat(a)}x + ${formatRat(b)} = ${formatRat(c)}` },
                { title: "a = 0, so the x term disappears", expression: `0·x = 0, so the equation becomes ${formatRat(b)} = ${formatRat(c)}` },
                { title: "Conclusion", expression: same
                    ? `${formatRat(b)} = ${formatRat(c)} is always true, so every real number x is a solution.`
                    : `${formatRat(b)} = ${formatRat(c)} is false, so no value of x can satisfy the equation.` },
              ],
              details: [...base, { label: "Case", value: same ? "a = 0 and b = c" : "a = 0 and b ≠ c" }],
            };
          }

          const rhs = Q.sub(c, b);
          const x = Q.div(rhs, a);
          const xText = showQ(x, true);
          const lhsCheck = Q.add(Q.mul(a, x), b);
          const steps = [
            { title: "Equation", expression: eq },
            { title: "Subtract b from both sides", expression: `${formatRat(a)}x = ${formatRat(c)} − ${Q.sign(b) < 0 ? `(${formatRat(b)})` : formatRat(b)} = ${formatRat(rhs)}` },
            { title: "Divide both sides by a", expression: `x = ${formatRat(rhs)} ÷ ${Q.sign(a) < 0 ? `(${formatRat(a)})` : formatRat(a)}` },
            { title: "Simplify", expression: `x = ${xText}` },
            { title: "Check", expression: `${formatRat(a)} × ${Q.isInt(x) ? formatRat(x) : `(${fracText(x)})`} + ${Q.sign(b) < 0 ? `(${formatRat(b)})` : formatRat(b)} = ${formatRat(lhsCheck)} ${Q.cmp(lhsCheck, c) === 0 ? "✓ matches c" : ""}` },
          ];
          return {
            result: xText,
            resultText: `x = ${xText}`,
            steps,
            details: [
              ...base,
              { label: "Case", value: "a ≠ 0 — one solution" },
              { label: "Exact value", value: Q.isInt(x) ? formatRat(x) : fracText(x) },
              { label: "Decimal (max 4 places)", value: formatRat(x) },
            ],
          };
        },
      },
    },
  };
})();
