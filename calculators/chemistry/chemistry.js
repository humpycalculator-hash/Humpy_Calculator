/* =====================================================================
   chemistry.js — every calculator on the Chemistry page.
   To ADD one: copy a block, give it a new key, change fields + calculate().
   To REMOVE one: delete its block.
   Needs: utils.js
   ===================================================================== */
(() => {
  // Atomic masses in g/mol. Add an element here to make Molar Mass understand it.
  const ATOMIC_MASS = {
    H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007,
    O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085,
    P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956,
    Ti: 47.867, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693,
    Cu: 63.546, Zn: 65.38, Br: 79.904, Ag: 107.868, I: 126.904, Ba: 137.327,
    Au: 196.967, Hg: 200.592, Pb: 207.2, Sn: 118.71, Sr: 87.62,
  };
  const R = 8.314462618; // gas constant, Pa·m³·mol⁻¹·K⁻¹

  CATEGORIES.chemistry = {
    subcategories: {
      "molar-mass": {
        label: "Molar Mass", resultLabel: "Molar Mass",
        formula: "Sum of (atomic mass × atom count) for each element",
        definition: "Simple formulas only (e.g. H2O, NaCl, C6H12O6) — no parentheses.",
        fields: [textField("formula", "Chemical formula", "e.g. C6H12O6", { maxlength: 60 })],
        calculate: (v) => {
          const formula = String(v.formula || "").trim();
          if (!formula) throw new Error("Enter a chemical formula.");
          // Split "C6H12O6" into [C6, H12, O6]; the pieces must rebuild the whole text, otherwise it has illegal characters.
          const matches = [...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
          if (!matches.length || matches.map((m) => m[0]).join("") !== formula.replace(/\s+/g, "")) {
            throw new Error("Use a simple chemical formula such as H2O, NaCl or C6H12O6. Parentheses and unsupported characters are not accepted.");
          }
          let total = 0;
          const steps = [];
          for (const [, element, digits] of matches) {
            const count = digits ? parseInt(digits, 10) : 1;
            const mass = own(ATOMIC_MASS, element);
            if (mass === undefined) throw new Error(`Unknown element: ${element}.`);
            total += mass * count;
            steps.push(`${element} × ${count} = ${formatNumber(mass * count, 3)} g/mol`);
          }
          return { result: formatNumber(total, 3), unit: "g/mol", steps };
        },
      },

      molarity: {
        label: "Molarity", resultLabel: "Concentration",
        formula: "M = moles ÷ volume (L)",
        definition: "Molar concentration of a solution.",
        fields: [numField("moles", "Moles of solute (mol)", "e.g. 0.5"), numField("volume", "Volume of solution (L)", "e.g. 2")],
        calculate: (v) => {
          const moles = nonNegative(v.moles, "Moles"), volume = positive(v.volume, "Volume");
          const result = moles / volume;
          return { result: formatNumber(result), unit: "mol/L", steps: [`M = ${formatNumber(moles)} ÷ ${formatNumber(volume)} = ${formatNumber(result)} mol/L`] };
        },
      },

      ph: {
        label: "pH Calculator", resultLabel: "Result",
        formula: "pH = −log₁₀[H⁺] and [H⁺] = 10^(−pH)",
        definition: "pH is dimensionless. Hydrogen-ion concentration is expressed in mol/L (mol·L⁻¹).",
        fields: [
          selectField("mode", "Known value", opts(["toPh", "Hydrogen-ion concentration [H⁺]"], ["toConc", "pH value"])),
          numField("value", "Value", "e.g. 0.0001 or 4"),
        ],
        calculate: (v) => {
          const value = assertNumber(v.value, "Value");
          if (v.mode === "toPh") { // [H⁺] -> pH
            if (value <= 0) throw new Error("Hydrogen-ion concentration must be greater than zero.");
            const result = -Math.log10(value);
            return {
              result: formatNumber(result, 4), unit: "pH (unitless)",
              steps: [
                `Given [H⁺] = ${formatNumber(value)} mol/L`,
                `Formula: pH = −log₁₀[H⁺]`,
                `pH = −log₁₀(${formatNumber(value)}) = ${formatNumber(result, 4)}`,
              ],
              details: [
                { label: "Formula", value: "pH = −log₁₀[H⁺]" },
                { label: "About", value: "pH has no physical unit; it is a dimensionless measure." },
                { label: "Input unit", value: "mol/L (mol·L⁻¹)" },
                { label: "Result unit", value: "Unitless pH value" },
              ],
            };
          }
          const result = Math.pow(10, -value); // pH -> [H⁺]
          return {
            result: formatNumber(result, 4), unit: "mol/L (mol·L⁻¹)",
            steps: [
              `Given pH = ${formatNumber(value)}`,
              `Formula: [H⁺] = 10^(−pH)`,
              `[H⁺] = 10^(−${formatNumber(value)}) = ${formatNumber(result, 4)} mol/L`,
            ],
            details: [
              { label: "Formula", value: "[H⁺] = 10^(−pH)" },
              { label: "About", value: "Hydrogen-ion concentration is reported in mol/L." },
              { label: "Input unit", value: "pH is dimensionless" },
              { label: "Result unit", value: "mol/L (mol·L⁻¹)" },
            ],
          };
        },
      },

      "ideal-gas-law": {
        label: "Ideal Gas Law", resultLabel: "Calculated Value",
        formula: "P × V = n × R × T",
        definition: "Choose the variable to calculate, enter the other three values, and select their units. Temperature is converted to Kelvin and all values are converted to SI-compatible units before solving.",
        // The box for the variable being solved is hidden (see `variants`).
        fields: [
          selectField("solveFor", "Calculate unknown", opts(["p", "Pressure (P)"], ["vol", "Volume (V)"], ["n", "Moles (n)"], ["t", "Temperature (T)"])),
          numField("p", "Pressure (P)", "Enter pressure", { dependsOn: "solveFor", variants: { p: { hidden: true } } }),
          selectField("pu", "Pressure unit", opts(["atm", "atm"], ["kPa", "kPa"], ["Pa", "Pa"], ["bar", "bar"]), { dependsOn: "solveFor", variants: { p: { hidden: true } } }),
          numField("vol", "Volume (V)", "Enter volume", { dependsOn: "solveFor", variants: { vol: { hidden: true } } }),
          selectField("vu", "Volume unit", opts(["L", "Liter (L)"], ["mL", "Milliliter (mL)"], ["m3", "Cubic meter (m³)"]), { dependsOn: "solveFor", variants: { vol: { hidden: true } } }),
          numField("n", "Amount of gas (n)", "Enter moles", { dependsOn: "solveFor", variants: { n: { hidden: true } } }),
          numField("t", "Temperature (T)", "Enter temperature", { dependsOn: "solveFor", variants: { t: { hidden: true } } }),
          selectField("tu", "Temperature unit", opts(["K", "Kelvin (K)"], ["C", "Celsius (°C)"]), { dependsOn: "solveFor", variants: { t: { hidden: true } } }),
        ],
        calculate: (v) => {
          const toPa = { Pa: 1, kPa: 1000, atm: 101325, bar: 100000 };
          const toM3 = { m3: 1, L: 0.001, mL: 0.000001 };
          // Convert the three known values to SI (Pa, m³, mol, K); the unknown stays null.
          const P = v.solveFor === "p" ? null : positive(v.p, "Pressure") * own(toPa, v.pu);
          const V = v.solveFor === "vol" ? null : positive(v.vol, "Volume") * own(toM3, v.vu);
          const n = v.solveFor === "n" ? null : positive(v.n, "Moles");
          const T = v.solveFor === "t" ? null : (v.tu === "C" ? assertNumber(v.t, "Temperature") + 273.15 : positive(v.t, "Temperature"));
          if (T !== null && T <= 0) throw new Error("Temperature must be above absolute zero (0 K).");

          const conversions = [];
          if (P !== null) conversions.push(`Pressure conversion: ${formatNumber(v.p)} ${v.pu} = ${formatNumber(P)} Pa`);
          if (V !== null) conversions.push(`Volume conversion: ${formatNumber(v.vol)} ${v.vu} = ${formatNumber(V)} m³`);
          if (n !== null) conversions.push(`Amount of gas: ${formatNumber(n)} mol`);
          if (T !== null) conversions.push(`Temperature conversion: ${formatNumber(v.t)} ${v.tu} = ${formatNumber(T)} K`);

          let result, unit, equation, shown;
          if (v.solveFor === "p") {
            result = (n * R * T) / V; unit = "Pa"; equation = "P = nRT ÷ V";
            shown = `${formatNumber(result)} Pa (${formatNumber(result / 1000)} kPa · ${formatNumber(result / 101325)} atm)`;
          } else if (v.solveFor === "vol") {
            result = (n * R * T) / P; unit = "m³"; equation = "V = nRT ÷ P";
            shown = `${formatNumber(result)} m³ (${formatNumber(result * 1000)} L)`;
          } else if (v.solveFor === "n") {
            result = (P * V) / (R * T); unit = "mol"; equation = "n = PV ÷ RT";
            shown = `${formatNumber(result)} mol`;
          } else {
            result = (P * V) / (R * n); unit = "K"; equation = "T = PV ÷ nR";
            shown = `${formatNumber(result)} K (${formatNumber(result - 273.15)} °C)`;
          }
          if (!Number.isFinite(result) || result <= 0) throw new Error("The supplied values must produce a positive, finite result.");
          return {
            result: formatNumber(result), unit, resultText: shown,
            steps: [
              `Ideal Gas Law: P × V = n × R × T`,
              `R = 8.314462618 Pa·m³/(mol·K)`,
              ...conversions,
              equation,
              `Calculated ${v.solveFor.toUpperCase()} = ${shown}`,
            ],
            details: [
              { label: "Formula", value: "P × V = n × R × T" },
              { label: "Gas constant", value: "R = 8.314462618 Pa·m³/(mol·K)" },
              { label: "About", value: "The ideal gas law relates pressure, volume, amount of gas and absolute temperature." },
              { label: "Solved variable", value: v.solveFor.toUpperCase() },
              { label: "Result", value: shown },
            ],
          };
        },
      },
    },
  };
})();
