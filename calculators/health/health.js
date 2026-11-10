/* =====================================================================
   health.js — every calculator on the Health page.
   (Previously split between two files; each calculator is now defined exactly once.)
   To ADD one: copy a block, give it a new key, change fields + calculate().
   To REMOVE one: delete its block.
   Needs: utils.js
   ===================================================================== */
(() => {
  /* ---------- Shared option lists and helpers ---------- */
  const WEIGHT_UNITS = opts(["kg", "Kilograms (kg)"], ["lb", "Pounds (lb)"]);
  const HEIGHT_UNITS = opts(["cm", "Centimeters (cm)"], ["in", "Inches (in)"], ["ft-in", "Feet + inches (e.g. 5.8 = 5 ft 8 in)"], ["m", "Meters (m)"]);
  const SEX_OPTIONS = opts(["male", "Male"], ["female", "Female"]);
  const CM_IN = opts(["cm", "Centimeters (cm)"], ["in", "Inches (in)"]);
  const LB_PER_KG = 0.45359237;

  // Number check with a range (health inputs are stricter than the generic validators).
  const ranged = (value, label, min, max) => {
    if (value === "" || value === null || value === undefined) throw new Error(`${label} is required.`);
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number.`);
    if (n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
    return n;
  };
  const weightKg = (value, unit) => {
    const raw = ranged(value, "Weight", 1, 700);
    return unit === "lb" ? raw * LB_PER_KG : raw;
  };
  const heightCm = (value, unit) => {
    if (unit === "ft-in") {
      // Feet-inches is typed as feet.inches: 5.8 = 5 ft 8 in, 5.11 = 5 ft 11 in.
      const numeric = ranged(value, "Height", 1, 8.11);
      const feet = Math.floor(numeric);
      const inches = Math.round((numeric - feet) * 100);
      if (feet < 1 || feet > 8 || inches > 11) throw new Error("Enter feet and inches as feet.inches, for example 5.08 = 5 ft 8 in or 5.11 = 5 ft 11 in.");
      return (feet * 12 + inches) * 2.54;
    }
    const raw = ranged(value, "Height", 30, 260);
    const cm = own({ cm: raw, in: raw * 2.54, m: raw * 100 }, unit);
    if (!cm || cm < 30 || cm > 260) throw new Error("Height must convert to a value between 30 and 260 cm.");
    return cm;
  };
  const ageValue = (v) => ranged(v, "Age", 18, 120);
  const fmt = (n, digits = 2) => Number(n).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const sexLabel = (sex) => (sex === "male" ? "Male" : "Female");
  // Mifflin–St Jeor: base = 10·kg + 6.25·cm − 5·age, then +5 (male) or −161 (female).
  const bmrValue = (kg, cm, age, sex) => {
    const base = 10 * kg + 6.25 * cm - 5 * age;
    return { base, bmr: base + (sex === "male" ? 5 : -161) };
  };
  const IMPORTANT_ADULT = "Adult estimate only. Actual energy needs vary.";

  // Weight, height, age and sex boxes shared by BMR and Calorie Needs.
  const bodyFields = () => [
    numField("weight", "Weight", "e.g. 68"),
    selectField("weightUnit", "Weight unit", WEIGHT_UNITS),
    numField("height", "Height", "e.g. 172 or 5.08"),
    selectField("heightUnit", "Height unit", HEIGHT_UNITS),
    numField("age", "Age (18–120 years)", "e.g. 25"),
    selectField("sex", "Sex used by equation", SEX_OPTIONS),
  ];

  CATEGORIES.health = {
    subcategories: {
      bmi: {
        label: "BMI", resultLabel: "BMI",
        formula: "BMI = weight (kg) ÷ height (m)²",
        definition: "Body Mass Index is a general adult screening measure, not a diagnosis.",
        fields: [
          numField("weight", "Weight", "e.g. 68"),
          selectField("weightUnit", "Weight unit", WEIGHT_UNITS),
          numField("height", "Height", "e.g. 172"),
          selectField("heightUnit", "Height unit", opts(["cm", "Centimeters (cm)"], ["in", "Inches (in)"], ["ft", "Feet (ft)"], ["m", "Meters (m)"])),
        ],
        calculate: (v) => {
          const rawWeight = positive(v.weight, "Weight"), rawHeight = positive(v.height, "Height");
          const weight = v.weightUnit === "lb" ? rawWeight * LB_PER_KG : rawWeight;
          const heightM = own({ cm: rawHeight / 100, in: rawHeight * 0.0254, ft: rawHeight * 0.3048, m: rawHeight }, v.heightUnit);
          const bmi = weight / (heightM * heightM);
          let category = "Obese";
          if (bmi < 18.5) category = "Underweight";
          else if (bmi < 25) category = "Normal range";
          else if (bmi < 30) category = "Overweight";
          return {
            result: formatNumber(bmi, 2), unit: category,
            steps: [
              `Convert weight: ${formatNumber(rawWeight)} ${v.weightUnit} = ${formatNumber(weight)} kg`,
              `Convert height: ${formatNumber(rawHeight)} ${v.heightUnit} = ${formatNumber(heightM)} m`,
              `BMI = weight ÷ height² = ${formatNumber(weight)} ÷ (${formatNumber(heightM)})² = ${formatNumber(bmi, 2)}`,
              `General adult category: ${category}`,
            ],
            details: [
              { label: "Formula", value: "BMI = weight (kg) ÷ height (m)²" },
              { label: "Converted weight", value: `${formatNumber(weight)} kg` },
              { label: "Converted height", value: `${formatNumber(heightM)} m` },
              { label: "About", value: "BMI is a screening estimate and does not diagnose health conditions." },
            ],
          };
        },
      },

      bmr: {
        label: "BMR", resultLabel: "Basal Metabolic Rate",
        formula: "Mifflin–St Jeor equation",
        definition: "Estimated energy used by the body at rest. This adult equation is an estimate, not a medical assessment.",
        fields: bodyFields(),
        calculate: (v) => {
          const kg = weightKg(v.weight, v.weightUnit), cm = heightCm(v.height, v.heightUnit), age = ageValue(v.age);
          const { base, bmr } = bmrValue(kg, cm, age, v.sex);
          const adjustment = v.sex === "male" ? "+5" : "−161";
          return {
            result: fmt(bmr, 0), unit: "kcal/day",
            steps: [
              `Convert weight: ${fmt(Number(v.weight))} ${v.weightUnit} = ${fmt(kg)} kg`,
              `Convert height: ${fmt(Number(v.height))} ${v.heightUnit} = ${fmt(cm)} cm`,
              `Base = (10 × ${fmt(kg)}) + (6.25 × ${fmt(cm)}) − (5 × ${fmt(age)}) = ${fmt(base)}`,
              `Apply ${sexLabel(v.sex)} equation adjustment (${adjustment}): ${fmt(base)} ${v.sex === "male" ? "+ 5" : "− 161"} = ${fmt(bmr)} kcal/day`,
            ],
            details: [
              { label: "Formula", value: "Mifflin–St Jeor: 10W + 6.25H − 5A + S" },
              { label: "Converted weight", value: `${fmt(kg)} kg` },
              { label: "Converted height", value: `${fmt(cm)} cm` },
              { label: "Equation adjustment", value: adjustment },
              { label: "Important", value: IMPORTANT_ADULT },
            ],
          };
        },
      },

      "calorie-needs": {
        label: "Calorie Needs", resultLabel: "Estimated Daily Energy Needs",
        formula: "TDEE = BMR × activity factor",
        definition: "An estimate of daily energy expenditure based on BMR and activity. It is not a personalized diet prescription.",
        fields: [
          ...bodyFields(),
          selectField("activity", "Activity level", opts(
            ["1.2", "Sedentary (little or no exercise)"],
            ["1.375", "Light (light activity 1–3 days/week)"],
            ["1.55", "Moderate (moderate activity 3–5 days/week)"],
            ["1.725", "Very active (hard activity 6–7 days/week)"],
            ["1.9", "Extra active (very hard activity)"],
          )),
        ],
        calculate: (v) => {
          const kg = weightKg(v.weight, v.weightUnit), cm = heightCm(v.height, v.heightUnit), age = ageValue(v.age);
          const { bmr } = bmrValue(kg, cm, age, v.sex);
          const factor = ranged(v.activity, "Activity factor", 1, 2);
          const total = bmr * factor;
          return {
            result: fmt(total, 0), unit: "kcal/day",
            steps: [
              `Convert weight: ${fmt(Number(v.weight))} ${v.weightUnit} = ${fmt(kg)} kg; height: ${fmt(Number(v.height))} ${v.heightUnit} = ${fmt(cm)} cm`,
              `Calculate BMR: (10 × ${fmt(kg)}) + (6.25 × ${fmt(cm)}) − (5 × ${fmt(age)}) ${v.sex === "male" ? "+ 5" : "− 161"} = ${fmt(bmr)} kcal/day`,
              `Choose activity factor: ${factor}`,
              `Estimated daily needs = BMR × activity factor = ${fmt(bmr)} × ${factor} = ${fmt(total)} kcal/day`,
            ],
            details: [
              { label: "BMR", value: `${fmt(bmr, 0)} kcal/day` },
              { label: "Activity factor", value: factor },
              { label: "Method", value: "Mifflin–St Jeor BMR × activity multiplier" },
              { label: "Important", value: "Adult estimate only; actual needs vary with health, growth, and circumstances." },
            ],
          };
        },
      },

      "body-fat": {
        label: "Body Fat %", resultLabel: "Estimated Body Fat",
        formula: "US Navy circumference method (logarithmic equations)",
        definition: "Estimate using waist, neck, height and (for women) hip circumference. All measurements are converted to centimeters.",
        fields: [
          selectField("sex", "Formula", SEX_OPTIONS),
          numField("waist", "Waist", "e.g. 85"),
          selectField("waistUnit", "Waist unit", CM_IN),
          numField("neck", "Neck", "e.g. 38"),
          selectField("neckUnit", "Neck unit", CM_IN),
          numField("hip", "Hip (women only)", "e.g. 95", { dependsOn: "sex", variants: { male: { hidden: true } } }),
          selectField("hipUnit", "Hip unit", CM_IN, { dependsOn: "sex", variants: { male: { hidden: true } } }),
          numField("height", "Height", "e.g. 172"),
          selectField("heightUnit", "Height unit", CM_IN),
        ],
        calculate: (v) => {
          const toCm = (value, unit, label) => positive(value, label) * (unit === "in" ? 2.54 : 1);
          const waist = toCm(v.waist, v.waistUnit, "Waist");
          const neck = toCm(v.neck, v.neckUnit, "Neck");
          const height = toCm(v.height, v.heightUnit, "Height");
          let result, hip = null;
          if (v.sex === "male") {
            if (waist <= neck) throw new Error("Waist must be larger than neck for the male formula.");
            result = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
          } else {
            hip = toCm(v.hip, v.hipUnit, "Hip");
            if (waist + hip <= neck) throw new Error("Waist + hip must be larger than neck for the female formula.");
            result = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
          }
          if (!Number.isFinite(result) || result < 0 || result > 100) throw new Error("Measurements produce an invalid body-fat estimate. Check the values and units.");
          return {
            result: formatNumber(result, 2), unit: "% body fat",
            steps: [
              `Convert waist: ${formatNumber(waist)} cm; neck: ${formatNumber(neck)} cm; height: ${formatNumber(height)} cm`,
              ...(hip === null ? [] : [`Convert hip: ${formatNumber(hip)} cm`]),
              `Apply the US Navy ${v.sex} circumference equation`,
              `Estimated body fat = ${formatNumber(result, 2)}%`,
            ],
            details: [
              { label: "Formula", value: "US Navy circumference method" },
              { label: "Converted waist", value: `${formatNumber(waist)} cm` },
              { label: "Converted neck", value: `${formatNumber(neck)} cm` },
              ...(hip === null ? [] : [{ label: "Converted hip", value: `${formatNumber(hip)} cm` }]),
              { label: "Converted height", value: `${formatNumber(height)} cm` },
              { label: "About", value: "This is an estimate, not a medical diagnosis." },
            ],
          };
        },
      },

      "ideal-weight": {
        label: "Ideal Weight", resultLabel: "Reference Weight Estimate",
        formula: "Devine formula",
        definition: "A historical adult reference estimate, not a goal or judgment of body size. It does not account for individual differences.",
        fields: [
          numField("height", "Height", "e.g. 172 or 5.08"),
          selectField("heightUnit", "Height unit", HEIGHT_UNITS),
          selectField("sex", "Sex used by equation", SEX_OPTIONS),
          selectField("resultUnit", "Result unit", WEIGHT_UNITS),
        ],
        calculate: (v) => {
          const cm = heightCm(v.height, v.heightUnit);
          const inches = cm / 2.54;
          if (inches < 60 || inches > 102) throw new Error("The Devine reference equation is intended for adult heights from 5 ft to 8 ft 6 in.");
          const aboveFiveFeet = inches - 60;
          const kg = (v.sex === "male" ? 50 : 45.5) + 2.3 * aboveFiveFeet;
          const output = v.resultUnit === "lb" ? kg / LB_PER_KG : kg;
          const unit = v.resultUnit;
          return {
            result: fmt(output, 1), unit,
            steps: [
              `Convert height: ${fmt(cm)} cm = ${fmt(inches, 2)} inches`,
              `Inches above 5 ft: ${fmt(inches)} − 60 = ${fmt(aboveFiveFeet)} inches`,
              `Devine (${sexLabel(v.sex)}): ${v.sex === "male" ? "50" : "45.5"} + (2.3 × ${fmt(aboveFiveFeet)}) = ${fmt(kg, 1)} kg`,
              ...(unit === "lb" ? [`Convert result: ${fmt(kg, 1)} kg ÷ 0.45359237 = ${fmt(output, 1)} lb`] : []),
            ],
            details: [
              { label: "Formula", value: "Male: 50 + 2.3 × inches over 60; Female: 45.5 + 2.3 × inches over 60" },
              { label: "Converted height", value: `${fmt(cm)} cm` },
              { label: "Reference value", value: `${fmt(kg, 1)} kg` },
              { label: "Important", value: "This is a population-level reference estimate, not an individual health target." },
            ],
          };
        },
      },

      "water-intake": {
        label: "Water Intake", resultLabel: "Estimated Daily Water",
        formula: "0.033 L/kg + 0.35 L per 30 minutes of activity",
        definition: "A simple hydration estimate. Needs vary with climate, health, diet, and activity; thirst and medical guidance matter.",
        fields: [
          numField("weight", "Weight", "e.g. 68"),
          selectField("weightUnit", "Weight unit", WEIGHT_UNITS),
          numField("activity", "Exercise (minutes/day)", "e.g. 30"),
        ],
        calculate: (v) => {
          const kg = weightKg(v.weight, v.weightUnit);
          const activity = ranged(v.activity, "Exercise minutes", 0, 600);
          const baseline = kg * 0.033;
          const extra = (activity / 30) * 0.35;
          const liters = baseline + extra;
          return {
            result: fmt(liters, 2), unit: "liters/day",
            steps: [
              `Convert weight: ${fmt(Number(v.weight))} ${v.weightUnit} = ${fmt(kg)} kg`,
              `Baseline estimate = ${fmt(kg)} × 0.033 = ${fmt(baseline, 2)} L/day`,
              `Activity adjustment = (${fmt(activity)} ÷ 30) × 0.35 = ${fmt(extra, 2)} L`,
              `Estimated total = ${fmt(baseline, 2)} + ${fmt(extra, 2)} = ${fmt(liters, 2)} L/day`,
            ],
            details: [
              { label: "Baseline estimate", value: `${fmt(baseline, 2)} L/day` },
              { label: "Activity adjustment", value: `${fmt(extra, 2)} L` },
              { label: "Approx. cups (250 mL)", value: `${fmt(liters / 0.25, 1)} cups` },
              { label: "Important", value: "This is a rough guide, not a required target. Follow clinician advice if you have fluid restrictions." },
            ],
          };
        },
      },
    },
  };
})();
