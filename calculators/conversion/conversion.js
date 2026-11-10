/* =====================================================================
   conversion.js — every converter on the Unit Converters page.
   ADD a unit      -> add one line to the matching *_UNITS table (factor = how many BASE units it equals).
   ADD a converter -> add a table, then one unitConverter(...) entry at the bottom.
   REMOVE one      -> delete its entry.
   Needs: utils.js
   ===================================================================== */
(() => {
  /* ---------- Unit tables: factor = how many BASE units one of this unit equals (base named in each comment) ---------- */
  const LENGTH_UNITS = { // base: meter
    m:    { symbol: "m",  name: "meter",      plural: "meters",      factor: 1 },
    km:   { symbol: "km", name: "kilometer",  plural: "kilometers",  factor: 1000 },
    cm:   { symbol: "cm", name: "centimeter", plural: "centimeters", factor: 0.01 },
    mm:   { symbol: "mm", name: "millimeter", plural: "millimeters", factor: 0.001 },
    mile: { symbol: "mi", name: "mile",       plural: "miles",       factor: 1609.344 },
    yard: { symbol: "yd", name: "yard",       plural: "yards",       factor: 0.9144 },
    foot: { symbol: "ft", name: "foot",       plural: "feet",        factor: 0.3048 },
    inch: { symbol: "in", name: "inch",       plural: "inches",      factor: 0.0254 },
  };
  const MASS_UNITS = { // base: kilogram
    kg:          { symbol: "kg",  name: "kilogram",   plural: "kilograms",   factor: 1 },
    g:           { symbol: "g",   name: "gram",       plural: "grams",       factor: 0.001 },
    mg:          { symbol: "mg",  name: "milligram",  plural: "milligrams",  factor: 0.000001 },
    lb:          { symbol: "lb",  name: "pound",      plural: "pounds",      factor: 0.45359237 },
    oz:          { symbol: "oz",  name: "ounce",      plural: "ounces",      factor: 0.028349523125 },
    "metric-ton": { symbol: "t",  name: "metric ton", plural: "metric tons", factor: 1000 },
    "us-ton":    { symbol: "ton", name: "US ton",     plural: "US tons",     factor: 907.18474 },
    stone:       { symbol: "st",  name: "stone",      plural: "stone",       factor: 6.35029318 },
  };
  const VOLUME_UNITS = { // base: liter
    L:            { symbol: "L",   name: "liter",            plural: "liters",            factor: 1 },
    mL:           { symbol: "mL",  name: "milliliter",       plural: "milliliters",       factor: 0.001 },
    gallon:       { symbol: "gal", name: "US gallon",        plural: "US gallons",        factor: 3.785411784 },
    quart:        { symbol: "qt",  name: "US quart",         plural: "US quarts",         factor: 0.946352946 },
    pint:         { symbol: "pt",  name: "US pint",          plural: "US pints",          factor: 0.473176473 },
    "metric-cup": { symbol: "cup", name: "metric cup",       plural: "metric cups",       factor: 0.25 },
    "us-cup":     { symbol: "cup", name: "US customary cup", plural: "US customary cups", factor: 0.2365882365 },
    m3:           { symbol: "m³",  name: "cubic meter",      plural: "cubic meters",      factor: 1000 },
  };
  const DATA_UNITS = { // base: bit (decimal prefixes: KB = 1000 B)
    b:  { symbol: "b",  name: "bit",       plural: "bits",       factor: 1 },
    B:  { symbol: "B",  name: "byte",      plural: "bytes",      factor: 8 },
    KB: { symbol: "KB", name: "kilobyte",  plural: "kilobytes",  factor: 8e3 },
    MB: { symbol: "MB", name: "megabyte",  plural: "megabytes",  factor: 8e6 },
    GB: { symbol: "GB", name: "gigabyte",  plural: "gigabytes",  factor: 8e9 },
    TB: { symbol: "TB", name: "terabyte",  plural: "terabytes",  factor: 8e12 },
    PB: { symbol: "PB", name: "petabyte",  plural: "petabytes",  factor: 8e15 },
    EB: { symbol: "EB", name: "exabyte",   plural: "exabytes",   factor: 8e18 },
    ZB: { symbol: "ZB", name: "zettabyte", plural: "zettabytes", factor: 8e21 },
    YB: { symbol: "YB", name: "yottabyte", plural: "yottabytes", factor: 8e24 },
    RB: { symbol: "RB", name: "ronnabyte", plural: "ronnabytes", factor: 8e27 },
    QB: { symbol: "QB", name: "quettabyte", plural: "quettabytes", factor: 8e30 },
  };
  const AREA_UNITS = { // base: square meter
    sqm:     { symbol: "m²",   name: "square meter",     plural: "square meters",     factor: 1 },
    sqft:    { symbol: "ft²",  name: "square foot",      plural: "square feet",       factor: 0.09290304 },
    acre:    { symbol: "acre", name: "acre",             plural: "acres",             factor: 4046.8564224 },
    hectare: { symbol: "ha",   name: "hectare",          plural: "hectares",          factor: 10000 },
    sqkm:    { symbol: "km²",  name: "square kilometer", plural: "square kilometers", factor: 1e6 },
    sqmile:  { symbol: "mi²",  name: "square mile",      plural: "square miles",      factor: 2589988.110336 },
  };
  const TEMP_SCALES = {
    C: { symbol: "°C", name: "degrees Celsius" },
    F: { symbol: "°F", name: "degrees Fahrenheit" },
    K: { symbol: "K",  name: "kelvin" },
  };
  const CURRENCIES = {
    USD: { name: "United States dollar" }, EUR: { name: "Euro" }, GBP: { name: "British pound" },
    PKR: { name: "Pakistani rupee" }, INR: { name: "Indian rupee" }, AED: { name: "UAE dirham" },
    SAR: { name: "Saudi riyal" }, JPY: { name: "Japanese yen" }, CNY: { name: "Chinese yuan" },
  };

  /* ---------- Converters ---------- */

  const unitOptions = (units) => Object.entries(units).map(([value, u]) => ({ value, label: `${u.symbol} (${u.name})` }));
  const plainOptions = (keys) => keys.map((k) => ({ value: k, label: k }));
  const unitLabel = (unit, value) => `${unit.symbol} (${value === 1 ? unit.name : unit.plural})`;

  // Any "multiply by a factor" conversion: value -> base unit -> target unit.
  function linearConverter(units, base) {
    return (v) => {
      const value = nonNegative(v.value, "Value");
      const from = own(units, v.from), to = own(units, v.to);
      if (!from || !to) throw new Error("Choose a valid source and target unit.");
      const inBase = value * from.factor;
      const result = inBase / to.factor;
      return {
        result: formatNumber(result, 4),
        resultText: `${formatNumber(result, 4)} ${unitLabel(to, result)}`,
        steps: [
          { title: "Convert to the base unit", expression: `${formatNumber(value)} ${from.symbol} × ${formatNumber(from.factor, 4)} = ${formatNumber(inBase, 4)} ${base.symbol}` },
          { title: "Convert to the target unit", expression: `${formatNumber(inBase, 4)} ${base.symbol} ÷ ${formatNumber(to.factor, 4)} = ${formatNumber(result, 4)} ${to.symbol}` },
        ],
        details: [
          { label: "Base/SI unit", value: `${base.name} (${base.symbol})` },
          { label: `1 ${from.symbol}`, value: `${formatNumber(from.factor, 4)} ${base.symbol}` },
          { label: `1 ${to.symbol}`, value: `${formatNumber(to.factor, 4)} ${base.symbol}` },
        ],
      };
    };
  }

  // Temperature is not a simple factor, so it goes through Celsius.
  function temperatureConverter(v) {
    const value = assertNumber(v.value, "Temperature");
    const from = v.from, to = v.to;
    if (!own(TEMP_SCALES, from) || !own(TEMP_SCALES, to)) throw new Error("Choose a valid temperature scale.");
    if (from === "K" && value < 0) throw new Error("Kelvin cannot be negative.");

    const c = from === "C" ? value : from === "F" ? ((value - 32) * 5) / 9 : value - 273.15;
    if (c < -273.15) throw new Error("Temperature cannot be below absolute zero (−273.15 °C).");
    const result = to === "C" ? c : to === "F" ? (c * 9) / 5 + 32 : c + 273.15;

    const relation = (scale) => scale === "C" ? "°C is the reference scale" : scale === "F" ? "°C = (°F − 32) × 5/9" : "°C = K − 273.15";
    return {
      result: formatNumber(result, 2),
      resultText: `${formatNumber(result, 2)} ${TEMP_SCALES[to].symbol} (${TEMP_SCALES[to].name})`,
      steps: [
        { title: "Convert to Celsius reference", expression: `${formatNumber(value, 2)} ${TEMP_SCALES[from].symbol} → ${formatNumber(c, 2)} °C` },
        { title: "Convert to target scale", expression: `${formatNumber(c, 2)} °C → ${formatNumber(result, 2)} ${TEMP_SCALES[to].symbol}` },
      ],
      details: [
        { label: "Reference scale", value: "Celsius (°C)" },
        { label: `${TEMP_SCALES[from].symbol} relationship`, value: relation(from) },
        { label: `${TEMP_SCALES[to].symbol} relationship`, value: relation(to) },
      ],
    };
  }

  // Currency uses a rate typed in by the visitor (no live data, no network requests).
  function currencyConverter(v) {
    const amount = nonNegative(v.value, "Amount");
    const rate = positive(v.rate, "Exchange rate");
    const from = v.from, to = v.to;
    if (!own(CURRENCIES, from) || !own(CURRENCIES, to)) throw new Error("Choose a valid source and target currency.");
    const result = amount * rate;
    return {
      result: formatNumber(result, 2),
      resultText: `${formatNumber(result, 2)} ${to} (${CURRENCIES[to].name})`,
      steps: [{ title: "Apply the exchange rate", expression: `${formatNumber(amount, 2)} ${from} × ${formatNumber(rate, 6)} ${to}/${from} = ${formatNumber(result, 2)} ${to}` }],
      details: [
        { label: "Rate used", value: `1 ${from} = ${formatNumber(rate, 6)} ${to}` },
        { label: "Rate direction", value: `${to} units per 1 ${from} unit` },
        { label: "Note", value: "Manually entered rate; not live market data." },
      ],
    };
  }

  /* ---------- The page's calculators ---------- */

  // One entry for a factor-based converter: label, example value, definition text, unit table, base unit key.
  const unitConverter = (label, example, definition, units, baseKey) => ({
    label, resultLabel: "Converted Value",
    formula: "value × (from-unit factor ÷ to-unit factor)",
    definition,
    fields: [
      numField("value", "Value", example),
      selectField("from", "From", unitOptions(units)),
      selectField("to", "To", unitOptions(units)),
    ],
    calculate: linearConverter(units, units[baseKey]),
  });

  CATEGORIES.conversion = {
    subcategories: {
      length: unitConverter("Length", "e.g. 15", "Length conversion. Base/SI unit: meter.", LENGTH_UNITS, "m"),
      weight: unitConverter("Weight / Mass", "e.g. 70", "Mass conversion. Base unit: kilogram. US ton = short ton (2,000 lb).", MASS_UNITS, "kg"),
      temperature: {
        label: "Temperature", resultLabel: "Converted Value",
        formula: "°F = °C × 9/5 + 32 · K = °C + 273.15",
        definition: "Temperature conversion with absolute-zero validation.",
        fields: [
          numField("value", "Value", "e.g. 100"),
          selectField("from", "From", plainOptions(["C", "F", "K"])),
          selectField("to", "To", plainOptions(["C", "F", "K"])),
        ],
        calculate: temperatureConverter,
      },
      currency: {
        label: "Currency", resultLabel: "Converted Value",
        formula: "Result = Amount × Rate",
        definition: "Manual exchange-rate converter. Rate = target currency units per 1 source currency unit.",
        fields: [
          numField("value", "Amount", "e.g. 10"),
          selectField("from", "From", Object.entries(CURRENCIES).map(([value, c]) => ({ value, label: `${value} (${c.name})` }))),
          selectField("to", "To", Object.entries(CURRENCIES).map(([value, c]) => ({ value, label: `${value} (${c.name})` }))),
          numField("rate", "Exchange rate — target units per 1 source unit", "e.g. 278 for PKR per USD"),
        ],
        calculate: currencyConverter,
      },
      volume: unitConverter("Volume", "e.g. 2", "Volume conversion. Base unit: liter. US customary cup and metric cup are distinct.", VOLUME_UNITS, "L"),
      "data-storage": unitConverter("Data Storage", "e.g. 500", "Data storage conversion. Base unit: bit. Decimal KB/MB/GB use powers of 1000.", DATA_UNITS, "b"),
      area: unitConverter("Area", "e.g. 1000", "Area conversion. Base unit: square meter.", AREA_UNITS, "sqm"),
    },
  };
})();
