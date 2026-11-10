/* =====================================================================
   calculator-engine.js — the shared logic behind ALL calculator pages.
   It reads  <div id="calculator-app" data-category="math">  from the page, finds that
   category in CATEGORIES (filled by calculators/<name>/<name>.js) and then:
     1. fills the "Select operation" dropdown + "Common formulas" + "Related calculators"
     2. draws the input fields of the chosen calculator
     3. on "Calculate Result" validates the inputs, runs sub.calculate() and draws the solution
   Load order on a calculator page: utils.js, site-config.js, <category>.js, layout.js, this file.

   A calculator ("sub") looks like this (see any calculators/<name>/<name>.js):
     { label, resultLabel, formula, definition,
       fields:[{id,label,type:"number"|"text"|"select",placeholder,options,hint,section,dependsOn,variants}],
       calculate(values) -> { result, unit, resultText?, secondary?, steps:[...], details?:[...] },
       customUI?: { mount(box), collect() } }       <- only used by the GPA calculators
   ===================================================================== */

const app = document.getElementById("calculator-app");
const categoryKey = app.dataset.category;
const category = CATEGORIES[categoryKey];
const subEntries = Object.entries(category.subcategories);

const opSelect = document.getElementById("operation-select");
const fieldsBox = document.getElementById("dynamic-fields");
const solutionBody = document.getElementById("solution-body");
const badge = document.getElementById("solution-badge");
const calcBtn = document.getElementById("calculate-btn");
const infoBox = document.getElementById("calculation-info");

/* ---------- 1. Static page parts ---------- */
opSelect.innerHTML = subEntries.map(([key, sub]) => `<option value="${escapeHtml(key)}">${sanitizeHtml(sub.label)}</option>`).join("");

document.getElementById("formula-list").innerHTML = subEntries
  .map(([, sub]) => `<div class="formula-chip"><span>${sanitizeHtml(sub.label)}</span><span class="expr">${sanitizeHtml(sub.formula)}</span></div>`)
  .join("");

document.getElementById("related-list").innerHTML = SITE.categories
  .filter(([key]) => key !== categoryKey)
  .map(([key, label]) => `<a href="${siteUrl(`calculators/${key}/`)}">${label} Calculators</a>`)
  .join("");

/* ---------- 2. Theme-aware dropdown (replaces the browser's own <select> list) ---------- */
const CARET_SVG = `<svg class="cselect-caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function enhanceSelect(select) {
  // Build:  <div.cselect><button.cselect-btn/><ul.cselect-list role=listbox/></div>  next to the hidden native select.
  const wrap = document.createElement("div");
  wrap.className = "cselect";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cselect-btn";
  btn.id = `${select.id}-button`;
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = `<span class="cselect-value"></span>${CARET_SVG}`;
  const list = document.createElement("ul");
  list.className = "cselect-list";
  list.id = `${select.id}-listbox`;
  list.setAttribute("role", "listbox");
  list.tabIndex = -1;
  btn.setAttribute("aria-controls", list.id);

  let items = [];
  const rebuildItems = () => {
    list.innerHTML = "";
    items = Array.from(select.options).map((opt, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = `${select.id}-option-${i}`;
      li.dataset.index = String(i);
      li.textContent = opt.textContent;
      list.appendChild(li);
      return li;
    });
  };
  rebuildItems();
  wrap.append(btn, list);
  select.classList.add("cselect-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.after(wrap);
  const label = document.querySelector(`label[for="${select.id}"]`);
  if (label) label.htmlFor = btn.id;

  let active = select.selectedIndex; // highlighted row while the list is open
  const valueEl = btn.querySelector(".cselect-value");
  const isOpen = () => list.classList.contains("is-open");

  // Show the chosen option on the button and mark it in the list.
  const sync = () => {
    valueEl.textContent = select.options[select.selectedIndex].textContent;
    items.forEach((li, i) => {
      const on = i === select.selectedIndex;
      li.classList.toggle("is-selected", on);
      li.setAttribute("aria-selected", String(on));
    });
  };
  const setActive = (i) => {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, idx) => li.classList.toggle("is-active", idx === active));
    list.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  };
  const open = () => {
    wrap.classList.add("is-open");
    list.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    setActive(select.selectedIndex);
    list.focus({ preventScroll: true });
  };
  const close = (refocus) => {
    wrap.classList.remove("is-open");
    list.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus({ preventScroll: true });
  };
  const choose = (i) => {
    if (select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync();
    close(true);
  };
  wrap._close = () => close(false); // used by the page-wide "click outside" handler below

  btn.addEventListener("click", () => (isOpen() ? close(false) : open()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) choose(Number(li.dataset.index));
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li");
    if (li && Number(li.dataset.index) !== active) setActive(Number(li.dataset.index));
  });
  list.addEventListener("keydown", (e) => {
    const startsWith = (li, ch) => li.textContent.trim().toLowerCase().startsWith(ch);
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(true); }
    else if (e.key === "Tab") close(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) { // type a letter to jump to the next matching option
      const ch = e.key.toLowerCase();
      const next = items.findIndex((li, i) => i > active && startsWith(li, ch));
      const idx = next >= 0 ? next : items.findIndex((li) => startsWith(li, ch));
      if (idx >= 0) setActive(idx);
    }
  });
  select.addEventListener("change", sync);
  // Keep the list in step if the options of the native select are replaced.
  new MutationObserver(() => {
    rebuildItems();
    active = Math.max(0, Math.min(items.length - 1, select.selectedIndex));
    sync();
  }).observe(select, { childList: true, subtree: true });
  sync();
}

// One page-wide handler: a click outside closes every open dropdown.
document.addEventListener("click", (e) => {
  document.querySelectorAll(".cselect.is-open").forEach((w) => { if (!w.contains(e.target)) w._close(); });
});

// Enhance every <select> inside `root` once.
function enhanceDropdowns(root) {
  root.querySelectorAll("select").forEach((select) => {
    if (select.dataset.enhanced) return;
    select.dataset.enhanced = "true";
    enhanceSelect(select);
  });
}
enhanceSelect(opSelect);
// The GPA screens add dropdowns after the first render, so watch for them.
new MutationObserver(() => enhanceDropdowns(fieldsBox)).observe(fieldsBox, { childList: true, subtree: true });

/* ---------- 3. Input fields of the selected calculator ---------- */
const MAX_LENGTH = { number: 40, text: 100 }; // SECURITY: cap how much a visitor can type into one field

function renderFields(sub) {
  if (sub.customUI) { // GPA family draws its own interface
    fieldsBox.innerHTML = "";
    sub.customUI.mount(fieldsBox);
    enhanceDropdowns(fieldsBox);
    return;
  }
  let activeSection = null;
  fieldsBox.innerHTML = sub.fields.map((f) => {
    const heading = f.section && f.section !== activeSection ? `<div class="field-section-heading">${sanitizeHtml(f.section)}</div>` : "";
    activeSection = f.section || null;
    const id = escapeHtml(f.id);
    const field = f.type === "select"
      ? `<div class="field-group" data-group="${id}">
          <label for="field-${id}">${sanitizeHtml(f.label)}</label>
          <select id="field-${id}" data-field-id="${id}" data-field-type="select">
            ${f.options.map((o) => `<option value="${escapeHtml(o.value)}">${sanitizeHtml(o.label)}</option>`).join("")}
          </select>
        </div>`
      : `<div class="field-group" data-group="${id}">
          <label for="field-${id}">${sanitizeHtml(f.label)}</label>
          <input id="field-${id}" type="text" ${f.type === "number" ? 'inputmode="decimal" autocomplete="off"' : ""}
            maxlength="${f.maxlength || MAX_LENGTH[f.type] || 100}"
            placeholder="${escapeHtml(f.placeholder || "")}" data-field-id="${id}" data-field-type="${escapeHtml(f.type)}" />
          ${f.hint ? `<p class="field-hint">${sanitizeHtml(f.hint)}</p>` : ""}
        </div>`;
    return heading + field;
  }).join("");
  enhanceDropdowns(fieldsBox);
  applyFieldVariants(sub);
}

// A field with `dependsOn` + `variants` changes label / placeholder / visibility when another field changes
// (e.g. Area & Perimeter: Length & Width -> Side -> Radius -> Base & Height).
function applyFieldVariants(sub) {
  const dependent = sub.fields.filter((f) => f.dependsOn && f.variants);
  if (!dependent.length) return;
  const update = () => dependent.forEach((f) => {
    const trigger = fieldsBox.querySelector(`#field-${f.dependsOn}`);
    const variant = (trigger && f.variants[trigger.value]) || {};
    const group = fieldsBox.querySelector(`[data-group="${f.id}"]`);
    const input = group.querySelector("[data-field-id]");
    group.querySelector("label").textContent = variant.label || f.label;
    input.placeholder = variant.placeholder || f.placeholder || "";
    group.hidden = !!variant.hidden;
    input.disabled = !!variant.hidden; // hidden inputs are never required or read
    if (variant.hidden) input.value = "";
  });
  dependent.forEach((f) => {
    const trigger = fieldsBox.querySelector(`#field-${f.dependsOn}`);
    if (trigger) trigger.addEventListener("change", () => { update(); resetSolution(); });
  });
  update();
}

/* ---------- 4. Solution box ---------- */
function resetSolution() {
  badge.textContent = "Ready";
  badge.classList.remove("is-solved", "is-error");
  solutionBody.innerHTML = '<p class="solution-placeholder">Fill in the values on the left and press Calculate Result to see a step-by-step solution.</p>';
  if (infoBox) infoBox.innerHTML = "";
}

function renderSolution(sub, out) {
  badge.textContent = "Solved";
  badge.classList.add("is-solved");
  badge.classList.remove("is-error");

  // SECURITY: every piece of text goes through sanitizeHtml() before it reaches innerHTML.
  const stepsHtml = (out.steps || []).map((step, i) => {
    const title = typeof step === "string" ? `Step ${i + 1}` : step.title || `Step ${i + 1}`;
    const expression = typeof step === "string" ? step : step.expression;
    return `
        <section class="solution-step">
          <h4>${sanitizeHtml(title)}</h4>
          <p class="expr">${sanitizeHtml(expression)}</p>
        </section>`;
  }).join("");

  // Prefer the details the calculator produced itself; otherwise show its formula (+ definition).
  const detailItems = Array.isArray(out.details) ? out.details : [];
  const infoItems = detailItems.length
    ? [...detailItems]
    : [
        { label: "Formula", value: sub.formula },
        ...(sub.definition && categoryKey !== "conversion" ? [{ label: "About", value: sub.definition }] : []),
      ];
  // Converters always show their formula, but never twice.
  if (categoryKey === "conversion" && sub.formula && !infoItems.some((d) => /formula/i.test(d.label || ""))) {
    infoItems.push({ label: "Formula", value: sub.formula });
  }
  const detailsHtml = infoItems.map((d) => `
    <div class="conversion-detail-row"><span>${sanitizeHtml(d.label)}</span><strong>${sanitizeHtml(d.value)}</strong></div>
  `).join("");

  const displayResult = out.resultText || `${out.result}${out.unit ? " " + out.unit : ""}`;
  solutionBody.innerHTML = `
    <div class="solution-steps">${stepsHtml}</div>
    <div class="solution-result">
      <div class="label">${sanitizeHtml(out.resultLabel || sub.resultLabel || "Result")}</div>
      <div class="value">${sanitizeHtml(displayResult)}</div>
      ${out.secondary ? `<div class="solution-result-secondary"><span>${sanitizeHtml(out.secondary.label)}</span><strong>${sanitizeHtml(out.secondary.value)}</strong></div>` : ""}
    </div>`;
  if (infoBox) {
    const heading = categoryKey === "conversion" ? "Conversion Details" : "Calculation Details";
    infoBox.innerHTML = `<aside class="conversion-details" aria-label="${heading}"><span class="details-heading">${heading}</span>${detailsHtml}</aside>`;
  }
}

function renderError(message) {
  badge.textContent = "Error";
  badge.classList.remove("is-solved");
  badge.classList.add("is-error");
  // SECURITY: error text can contain what the visitor typed, so it is always escaped (never parsed as HTML).
  solutionBody.innerHTML = `<p class="solution-placeholder solution-error">${escapeHtml(message)}</p>`;
  if (infoBox) infoBox.innerHTML = "";
}

/* ---------- 5. Events ---------- */
opSelect.addEventListener("change", () => {
  renderFields(category.subcategories[opSelect.value]);
  resetSolution();
});

// Reads every field; numbers become Number (NaN if malformed, "" if empty), selects/text stay strings.
function collectValues() {
  const values = {};
  fieldsBox.querySelectorAll("[data-field-id]").forEach((input) => {
    const id = input.dataset.fieldId;
    if (input.disabled) { values[id] = ""; return; }
    if (input.dataset.fieldType !== "number") { values[id] = input.value; return; }
    const normalized = input.value.trim().replace(/,/g, "").replace(/\s/g, "");
    if (normalized && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) values[id] = NaN;
    else values[id] = normalized === "" ? "" : Number(normalized);
  });
  return values;
}

calcBtn.addEventListener("click", () => {
  const sub = category.subcategories[opSelect.value];
  try {
    renderSolution(sub, sub.calculate(sub.customUI ? sub.customUI.collect() : collectValues()));
  } catch (error) {
    renderError(error.message || "Invalid input. Please check the values and try again.");
  }
});

/* ---------- 6. Live thousands separators while typing in numeric fields ---------- */
function formatGroupedInput(input) {
  const before = input.value;
  const caret = input.selectionStart ?? before.length;
  const digitsBeforeCaret = before.slice(0, caret).replace(/,/g, "").length;
  const cleaned = before.replace(/,/g, "").replace(/[^0-9.+eE-]/g, "");
  // Keep half-typed states such as "-", "." and "12." usable.
  if (!cleaned || /^[+-]?$/.test(cleaned) || /^\d+\.$/.test(cleaned)) { input.value = cleaned; return; }
  const match = cleaned.match(/^([+-]?)(\d*)(\.\d*)?([eE][+-]?\d*)?$/);
  if (!match) return;
  const integer = (match[2] || "").replace(/^0+(?=\d)/, "");
  input.value = (match[1] || "") + integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (match[3] || "") + (match[4] || "");
  // Put the caret back after the same number of digits.
  let pos = 0, count = 0;
  while (pos < input.value.length && count < digitsBeforeCaret) {
    if (input.value[pos] !== ",") count++;
    pos++;
  }
  input.setSelectionRange(pos, pos);
}
fieldsBox.addEventListener("input", (event) => {
  const input = event.target.closest('input[data-field-type="number"]');
  if (input) formatGroupedInput(input);
});
fieldsBox.addEventListener("blur", (event) => { // tidy the number when the visitor leaves the field
  const input = event.target.closest('input[data-field-type="number"]');
  if (!input) return;
  const raw = input.value.trim().replace(/,/g, "");
  if (raw !== "" && Number.isFinite(Number(raw))) {
    input.value = new Intl.NumberFormat("en-US", { useGrouping: true, maximumFractionDigits: 4 }).format(Number(raw));
  }
}, true);

/* ---------- First render ---------- */
renderFields(category.subcategories[opSelect.value]);
