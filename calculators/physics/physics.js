/* =====================================================================
   physics.js — every calculator on the Physics page.
   To ADD one: copy any block below, give it a new key, change the fields + calculate().
   To REMOVE one: delete its block.  The page, dropdown, formula list and
   Formulas & Definitions page all update automatically.
   Needs: utils.js (validators, formatNumber, field builders)
   ===================================================================== */
(() => {
  const G = 9.80665; // standard gravity, m/s²

  // Most physics calculators have the same shape: one formula, one numeric result, one unit.
  // `steps` = [formula text, worked substitution]; both end up in the "Solution" box.
  const out = (value, unit, ...steps) => ({ result: formatNumber(value), unit, steps });

  CATEGORIES.physics = {
    subcategories: {
      "speed-velocity": {
        label: "Speed / Velocity", resultLabel: "Speed / Velocity",
        formula: "v = d ÷ t",
        definition: "Average speed is the distance travelled divided by the time taken. This calculator converts distance and time to SI units before calculating.",
        fields: [
          numField("d", "Distance", "e.g. 1.5"),
          selectField("du", "Distance unit", opts(["m", "Meter (m)"], ["km", "Kilometer (km)"], ["cm", "Centimeter (cm)"], ["mi", "Mile (mi)"], ["ft", "Foot (ft)"])),
          numField("t", "Time", "e.g. 10"),
          selectField("tu", "Time unit", opts(["s", "Second (s)"], ["min", "Minute (min)"], ["h", "Hour (h)"])),
        ],
        calculate: (v) => {
          const d = nonNegative(v.d, "Distance"), t = positive(v.t, "Time");
          const toMetres = { m: 1, km: 1000, cm: 0.01, mi: 1609.344, ft: 0.3048 };
          const toSeconds = { s: 1, min: 60, h: 3600 };
          const dm = own(toMetres, v.du), tm = own(toSeconds, v.tu);
          const metres = d * dm, seconds = t * tm, speed = metres / seconds;
          return {
            result: formatNumber(speed), unit: "m/s",
            steps: [
              `Convert distance: ${formatNumber(d)} ${v.du} × ${dm} = ${formatNumber(metres)} m`,
              `Convert time: ${formatNumber(t)} ${v.tu} × ${tm} = ${formatNumber(seconds)} s`,
              `v = d ÷ t = ${formatNumber(metres)} ÷ ${formatNumber(seconds)} = ${formatNumber(speed)} m/s`,
            ],
            details: [
              { label: "Formula", value: "v = d ÷ t" },
              { label: "About", value: "Speed tells how fast distance is covered. Velocity also includes direction." },
              { label: "Equivalent speeds", value: `${formatNumber(speed * 3.6)} km/h · ${formatNumber(speed * 2.236936292)} mph` },
            ],
          };
        },
      },

      force: {
        label: "Force (F = m × a)", resultLabel: "Force", formula: "F = m × a",
        definition: "Newton's second law: force equals mass multiplied by acceleration.",
        fields: [numField("m", "Mass (kg)", "e.g. 5"), numField("a", "Acceleration (m/s²)", "e.g. 2")],
        calculate: (v) => {
          const m = nonNegative(v.m, "Mass"), a = assertNumber(v.a, "Acceleration"), r = m * a;
          return out(r, "N", "F = m × a", `F = ${formatNumber(m)} × ${formatNumber(a)} = ${formatNumber(r)} N`);
        },
      },

      "kinetic-energy": {
        label: "Kinetic Energy", resultLabel: "Kinetic Energy", formula: "KE = ½ × m × v²",
        definition: "Kinetic energy is the energy an object has because it is moving.",
        fields: [numField("m", "Mass (kg)", "e.g. 2"), numField("v", "Velocity (m/s)", "e.g. 3")],
        calculate: (v) => {
          const m = nonNegative(v.m, "Mass"), vel = assertNumber(v.v, "Velocity"), r = 0.5 * m * vel * vel;
          return out(r, "J", "KE = ½ × m × v²", `KE = 0.5 × ${formatNumber(m)} × ${formatNumber(vel)}² = ${formatNumber(r)} J`);
        },
      },

      "potential-energy": {
        label: "Potential Energy", resultLabel: "Gravitational Potential Energy", formula: "PE = m × g × h",
        definition: "Gravitational potential energy is stored energy due to an object's height above a chosen reference level. Standard gravity is 9.80665 m/s².",
        fields: [numField("m", "Mass (kg)", "e.g. 2"), numField("h", "Height (m)", "e.g. 5"), numField("g", "Gravity (m/s²)", "default 9.80665")],
        calculate: (v) => {
          const m = nonNegative(v.m, "Mass"), h = nonNegative(v.h, "Height");
          const g = v.g === "" ? G : positive(v.g, "Gravity"); // blank = standard gravity
          const r = m * g * h;
          return out(r, "J", "PE = m × g × h", `PE = ${formatNumber(m)} × ${formatNumber(g)} × ${formatNumber(h)} = ${formatNumber(r)} J`);
        },
      },

      "work-done": {
        label: "Work Done", resultLabel: "Work Done", formula: "W = F × d × cos(θ)",
        definition: "Work is energy transferred when a force moves an object through a distance. θ is the angle between force and displacement.",
        fields: [numField("f", "Force (N)", "e.g. 20"), numField("d", "Displacement (m)", "e.g. 5"), numField("angle", "Angle θ (degrees)", "e.g. 30")],
        calculate: (v) => {
          const f = assertNumber(v.f, "Force"), d = nonNegative(v.d, "Displacement");
          const a = assertNumber(v.angle, "Angle", { min: 0, max: 180 });
          const r = f * d * Math.cos((a * Math.PI) / 180);
          return out(r, "J", "W = F × d × cos(θ)", `W = ${formatNumber(f)} × ${formatNumber(d)} × cos(${formatNumber(a)}°) = ${formatNumber(r)} J`);
        },
      },

      acceleration: {
        label: "Acceleration", resultLabel: "Acceleration", formula: "a = (v − u) ÷ t",
        definition: "Acceleration measures how quickly velocity changes over time.",
        fields: [numField("u", "Initial velocity u (m/s)", "e.g. 2"), numField("v", "Final velocity v (m/s)", "e.g. 12"), numField("t", "Time (s)", "e.g. 5")],
        calculate: (v) => {
          const u = assertNumber(v.u, "Initial velocity"), f = assertNumber(v.v, "Final velocity"), t = positive(v.t, "Time"), r = (f - u) / t;
          return out(r, "m/s²", "a = (v − u) ÷ t", `a = (${formatNumber(f)} − ${formatNumber(u)}) ÷ ${formatNumber(t)} = ${formatNumber(r)} m/s²`);
        },
      },

      momentum: {
        label: "Momentum", resultLabel: "Momentum", formula: "p = m × v",
        definition: "Momentum is the quantity of motion of an object and depends on its mass and velocity.",
        fields: [numField("m", "Mass (kg)", "e.g. 4"), numField("v", "Velocity (m/s)", "e.g. 3")],
        calculate: (v) => {
          const m = nonNegative(v.m, "Mass"), vel = assertNumber(v.v, "Velocity"), r = m * vel;
          return out(r, "kg·m/s", "p = m × v", `p = ${formatNumber(m)} × ${formatNumber(vel)} = ${formatNumber(r)} kg·m/s`);
        },
      },

      density: {
        label: "Density", resultLabel: "Density", formula: "ρ = m ÷ V",
        definition: "Density is mass per unit volume. Enter mass in kilograms and volume in cubic metres.",
        fields: [numField("m", "Mass (kg)", "e.g. 10"), numField("vol", "Volume (m³)", "e.g. 2")],
        calculate: (v) => {
          const m = nonNegative(v.m, "Mass"), vol = positive(v.vol, "Volume"), r = m / vol;
          return out(r, "kg/m³", "ρ = m ÷ V", `ρ = ${formatNumber(m)} ÷ ${formatNumber(vol)} = ${formatNumber(r)} kg/m³`);
        },
      },

      pressure: {
        label: "Pressure", resultLabel: "Pressure", formula: "P = F ÷ A",
        definition: "Pressure is the force applied perpendicular to a surface divided by its area.",
        fields: [numField("f", "Force (N)", "e.g. 100"), numField("area", "Area (m²)", "e.g. 2")],
        calculate: (v) => {
          const f = nonNegative(v.f, "Force"), a = positive(v.area, "Area"), r = f / a;
          return out(r, "Pa (N/m²)", "P = F ÷ A", `P = ${formatNumber(f)} ÷ ${formatNumber(a)} = ${formatNumber(r)} Pa`);
        },
      },

      power: {
        label: "Mechanical Power", resultLabel: "Power", formula: "P = W ÷ t",
        definition: "Power is the rate at which work is done or energy is transferred.",
        fields: [numField("w", "Work / Energy (J)", "e.g. 500"), numField("t", "Time (s)", "e.g. 10")],
        calculate: (v) => {
          const w = assertNumber(v.w, "Work / Energy"), t = positive(v.t, "Time"), r = w / t;
          return out(r, "W", "P = W ÷ t", `P = ${formatNumber(w)} ÷ ${formatNumber(t)} = ${formatNumber(r)} W`);
        },
      },

      "ohms-law": {
        label: "Ohm's Law", resultLabel: "Solved electrical value", formula: "V = I × R",
        definition: "Ohm's law relates voltage, current and resistance. Leave exactly one field blank to solve for it.",
        fields: [
          numField("voltage", "Voltage (V)", "leave blank to solve"),
          numField("current", "Current (A)", "leave blank to solve"),
          numField("resistance", "Resistance (Ω)", "leave blank to solve"),
        ],
        calculate: (v) => {
          // Whichever of the three boxes is empty is the value we solve for.
          const blanks = ["voltage", "current", "resistance"].filter((k) => isBlank(v[k]));
          if (blanks.length !== 1) throw new Error("Leave exactly one value blank and enter the other two.");
          let r, unit, working;
          if (blanks[0] === "voltage") {
            const i = assertNumber(v.current, "Current"), ohm = positive(v.resistance, "Resistance");
            r = i * ohm; unit = "V"; working = `V = I × R = ${formatNumber(i)} × ${formatNumber(ohm)}`;
          } else if (blanks[0] === "current") {
            const volt = assertNumber(v.voltage, "Voltage"), ohm = positive(v.resistance, "Resistance");
            r = volt / ohm; unit = "A"; working = `I = V ÷ R = ${formatNumber(volt)} ÷ ${formatNumber(ohm)}`;
          } else {
            const volt = assertNumber(v.voltage, "Voltage"), i = positive(v.current, "Current");
            r = volt / i; unit = "Ω"; working = `R = V ÷ I = ${formatNumber(volt)} ÷ ${formatNumber(i)}`;
          }
          return out(r, unit, `${working} = ${formatNumber(r)} ${unit}`);
        },
      },

      "electrical-power": {
        label: "Electrical Power", resultLabel: "Electrical Power", formula: "P = V × I",
        definition: "Electrical power is the rate at which electrical energy is transferred. Voltage and current may be positive or negative by sign convention.",
        fields: [numField("v", "Voltage (V)", "e.g. 12"), numField("i", "Current (A)", "e.g. 2")],
        calculate: (v) => {
          const volt = assertNumber(v.v, "Voltage"), i = assertNumber(v.i, "Current"), r = volt * i;
          return out(r, "W", "P = V × I", `P = ${formatNumber(volt)} × ${formatNumber(i)} = ${formatNumber(r)} W`);
        },
      },

      frequency: {
        label: "Frequency", resultLabel: "Frequency", formula: "f = 1 ÷ T",
        definition: "Frequency is the number of cycles per second. Period T is the time for one complete cycle.",
        fields: [numField("t", "Period (s)", "e.g. 0.02")],
        calculate: (v) => {
          const t = positive(v.t, "Period"), r = 1 / t;
          return out(r, "Hz", "f = 1 ÷ T", `f = 1 ÷ ${formatNumber(t)} = ${formatNumber(r)} Hz`);
        },
      },

      "wave-speed": {
        label: "Wave Speed", resultLabel: "Wave Speed", formula: "v = f × λ",
        definition: "Wave speed equals frequency multiplied by wavelength.",
        fields: [numField("f", "Frequency (Hz)", "e.g. 50"), numField("lambda", "Wavelength λ (m)", "e.g. 2")],
        calculate: (v) => {
          const f = nonNegative(v.f, "Frequency"), l = nonNegative(v.lambda, "Wavelength"), r = f * l;
          return out(r, "m/s", "v = f × λ", `v = ${formatNumber(f)} × ${formatNumber(l)} = ${formatNumber(r)} m/s`);
        },
      },

      "gravitational-force": {
        label: "Gravitational Force", resultLabel: "Gravitational Force", formula: "F = G × m₁ × m₂ ÷ r²",
        definition: "Newton's law of universal gravitation calculates attraction between two masses. G = 6.67430 × 10⁻¹¹ N·m²/kg².",
        fields: [
          numField("m1", "First mass (kg)", "e.g. 5.972e24"),
          numField("m2", "Second mass (kg)", "e.g. 1000"),
          numField("r", "Distance between centres (m)", "e.g. 6.371e6"),
        ],
        calculate: (v) => {
          const a = positive(v.m1, "First mass"), b = positive(v.m2, "Second mass"), r = positive(v.r, "Distance");
          const res = (6.6743e-11 * a * b) / (r * r);
          return out(res, "N", "F = G × m₁ × m₂ ÷ r²",
            `F = 6.67430 × 10⁻¹¹ × ${formatNumber(a)} × ${formatNumber(b)} ÷ ${formatNumber(r)}² = ${formatNumber(res)} N`);
        },
      },

      "free-fall": {
        label: "Free Fall / Gravity", resultLabel: "Result",
        formula: "v = g × t; h = ½ × g × t²",
        definition: "Velocity and distance fallen under gravity, starting from rest. Uses g = 9.80665 m/s².",
        fields: [
          selectField("mode", "Known value", opts(["time", "Fall time (s)"], ["height", "Fall height (m)"])),
          numField("value", "Value", "e.g. 3"),
        ],
        calculate: (v) => {
          const value = nonNegative(v.value, "Value");
          if (v.mode === "time") { // known fall time -> speed and height
            const vel = G * value, h = 0.5 * G * value * value;
            return out(vel, "m/s", `v = g × t = 9.80665 × ${formatNumber(value)} = ${formatNumber(vel)} m/s`, `h = ½ × g × t² = ${formatNumber(h)} m`);
          }
          const t = Math.sqrt((2 * value) / G), vel = G * t; // known height -> fall time and speed
          return out(t, "s", `t = √(2h ÷ g) = ${formatNumber(t)} s`, `v = g × t = ${formatNumber(vel)} m/s`);
        },
      },

      "projectile-motion": {
        label: "Projectile Motion", resultLabel: "Range",
        formula: "R = v² × sin(2θ) ÷ g",
        definition: "Calculates range, maximum height and flight time when launch and landing heights are equal. Assumes no air resistance.",
        fields: [numField("v", "Initial velocity (m/s)", "e.g. 20"), numField("angle", "Launch angle (°)", "e.g. 45")],
        calculate: (v) => {
          const vel = nonNegative(v.v, "Initial velocity"), angle = assertNumber(v.angle, "Launch angle", { min: 0, max: 90 });
          const rad = (angle * Math.PI) / 180;
          const range = (vel * vel * Math.sin(2 * rad)) / G;
          const maxH = (vel * vel * Math.sin(rad) ** 2) / (2 * G);
          const flight = (2 * vel * Math.sin(rad)) / G;
          return out(range, "m",
            `R = v² × sin(2θ) ÷ g = ${formatNumber(range)} m`,
            `Maximum height = v²sin²(θ) ÷ (2g) = ${formatNumber(maxH)} m`,
            `Flight time = 2v sin(θ) ÷ g = ${formatNumber(flight)} s`);
        },
      },
    },
  };
})();
