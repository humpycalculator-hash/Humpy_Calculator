/* =====================================================================
   gpa.js — GPA / SGPA / CGPA calculators for the Math page.
     1. Grading scale   (presets, saved in this browser's localStorage)
     2. Calculation     (pure maths on already-validated data -> "Solution" box content)
     3. Screen (DOM)    (course tables, semester blocks, scale editor)
   math.js plugs it in with:  customUI: makeGpaUI("gpa" | "sgpa" | "cgpa")
   Needs (load before): utils.js, rational.js
   ===================================================================== */

/* ---------- 1. Grading scale ---------- */

// Add or edit presets here: [grade, points] rows. `custom` has no rows (the visitor types their own).
const GRADE_PRESETS = {
  thirds: {
    label: "4.0 scale · A- = 3.67, B+ = 3.33 …",
    rows: [["A", 4], ["A-", 3.67], ["B+", 3.33], ["B", 3], ["B-", 2.67], ["C+", 2.33], ["C", 2], ["C-", 1.67], ["D+", 1.33], ["D", 1], ["F", 0]],
  },
  tenths: {
    label: "4.0 scale · A- = 3.7, B+ = 3.3 …",
    rows: [["A+", 4], ["A", 4], ["A-", 3.7], ["B+", 3.3], ["B", 3], ["B-", 2.7], ["C+", 2.3], ["C", 2], ["C-", 1.7], ["D+", 1.3], ["D", 1], ["F", 0]],
  },
  simple: {
    label: "4.0 scale · letters only (A–F)",
    rows: [["A", 4], ["B", 3], ["C", 2], ["D", 1], ["F", 0]],
  },
  custom: { label: "Custom (my own scale)", rows: null },
};

// Limits (SECURITY: keep stored data and the screen from growing without bound).
const GPA_LIMITS = { scaleRows: 30, courseRows: 40, semesters: 12 };
const GPA_STORAGE_KEY = "humpy-grade-scale";
let gradeScaleState = null; // { preset, rows:[{grade, points}] } — loaded once, then kept in memory

const cloneScaleRows = (rows) => rows.map(([grade, points]) => ({ grade, points: String(points) }));
const NUMBER_TEXT = /^(?:\d+\.?\d*|\.\d+)$/; // plain non-negative number, e.g. "3", "3.5", ".5"

function loadGradeScale() {
  if (gradeScaleState) return gradeScaleState;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(GPA_STORAGE_KEY) || "null"); } catch (e) { saved = null; }
  // SECURITY: anything read back from storage is shape- and size-checked before it is trusted.
  const valid = saved && Object.hasOwn(GRADE_PRESETS, saved.preset) && Array.isArray(saved.rows) &&
    saved.rows.length > 0 && saved.rows.length <= GPA_LIMITS.scaleRows &&
    saved.rows.every((r) => r && typeof r.grade === "string" && typeof r.points === "string" && r.grade.length <= 8 && r.points.length <= 12);
  gradeScaleState = valid
    ? { preset: saved.preset, rows: saved.rows.map((r) => ({ grade: r.grade, points: r.points })) }
    : { preset: "thirds", rows: cloneScaleRows(GRADE_PRESETS.thirds.rows) };
  return gradeScaleState;
}
const saveGradeScale = () => { try { localStorage.setItem(GPA_STORAGE_KEY, JSON.stringify(loadGradeScale())); } catch (e) {} };

// Checks the scale and returns { map: Map(grade -> {label, points}), max, name } or throws a friendly error.
function parseGradeScale() {
  const state = loadGradeScale();
  if (!state.rows.length) throw new Error("Grading scale is empty. Add at least one grade.");
  const map = new Map(), seen = new Set();
  let max = Q.make(0n);
  state.rows.forEach((row, i) => {
    const label = row.grade.trim();
    if (!label) throw new Error(`Grading scale, row ${i + 1}: grade name is required.`);
    if (seen.has(label.toLowerCase())) throw new Error(`Grading scale: "${label}" is listed more than once.`);
    seen.add(label.toLowerCase());
    const raw = String(row.points).trim().replace(/,/g, "");
    if (raw === "") throw new Error(`Grading scale: enter grade points for "${label}".`);
    if (!NUMBER_TEXT.test(raw)) throw new Error(`Grading scale: grade points for "${label}" must be a number of 0 or more.`);
    const n = Number(raw);
    if (n > 100) throw new Error(`Grading scale: grade points for "${label}" look too large (max 100).`);
    const points = Q.from(n);
    map.set(label, { label, points });
    if (Q.cmp(points, max) > 0) max = points;
  });
  return { map, max, name: GRADE_PRESETS[state.preset].label };
}

// A typed decimal (credit hours, quality points) -> exact fraction, or a friendly error.
function readDecimal(raw, label, { positive = false, max = 1000 } = {}) {
  const s = String(raw).trim().replace(/,/g, "");
  if (s === "") throw new Error(`${label} is required.`);
  if (!NUMBER_TEXT.test(s)) throw new Error(`${label} must be a valid number (0 or more).`);
  const q = Q.from(Number(s));
  if (positive && q.n === 0n) throw new Error(`${label} must be greater than zero.`);
  if (Q.cmp(q, Q.from(max)) > 0) throw new Error(`${label} must be at most ${max}.`);
  return q;
}

/* ---------- 2. Calculation -> Solution box ---------- */
// Visitor-typed names go through escapeHtml() before they are placed in the result.

const joinSum = (list) => list.map((q) => formatRat(q)).join(" + ");

function courseLines(courses) {
  return courses.map((c) =>
    `${escapeHtml(c.name)}: ${c.gradeLabel === undefined ? "" : `grade ${escapeHtml(c.gradeLabel)} → `}` +
    `${formatRat(c.gp)} grade points · QP = ${formatRat(c.credits)} × ${formatRat(c.gp)} = ${formatRat(c.qp)}`).join("<br>");
}

function summarise(courses) {
  const credits = sumQ(courses.map((c) => c.credits));
  const qp = sumQ(courses.map((c) => c.qp));
  return { credits, qp, gpa: Q.div(qp, credits) };
}

const gpaFormulas = (word, scope = "") => [
  { label: "Quality Points", value: "Credit Hours × Grade Points" },
  { label: "Formula", value: `${word} = Total Quality Points ÷ Total Credit Hours${scope}` },
];

// GPA and SGPA: one list of courses.
function buildGpaOutput(kind, data) {
  const word = kind === "sgpa" ? "SGPA" : "GPA";
  const courses = data.semesters[0].courses;
  const s = summarise(courses);
  const scale = escapeHtml(data.scaleName);
  const steps = [
    { title: "Grading scale", expression: scale },
    { title: "Grade points & quality points (QP = credit hours × grade points)", expression: courseLines(courses) },
    { title: "Total credit hours", expression: `${joinSum(courses.map((c) => c.credits))} = ${formatRat(s.credits)}` },
    { title: "Total quality points", expression: `${joinSum(courses.map((c) => c.qp))} = ${formatRat(s.qp)}` },
    { title: word, expression: `${word} = ${formatRat(s.qp)} ÷ ${formatRat(s.credits)} = ${formatRat(s.gpa)}` },
  ];
  const details = [
    ...gpaFormulas(word, kind === "sgpa" ? " (this semester)" : ""),
    ...(kind === "sgpa" && data.semesters[0].name ? [{ label: "Semester", value: escapeHtml(data.semesters[0].name) }] : []),
    { label: "Courses counted", value: String(courses.length) },
    { label: "Total credit hours", value: formatRat(s.credits) },
    { label: "Total quality points", value: formatRat(s.qp) },
    { label: "Grading scale", value: scale },
  ];
  return { result: formatRat(s.gpa), unit: "", resultText: formatRat(s.gpa), steps, details };
}

// CGPA: several semesters, each entered course-by-course or as totals.
function buildCgpaOutput(data) {
  const semResults = data.semesters.map((sem) =>
    sem.mode === "totals"
      ? { sem, credits: sem.credits, qp: sem.qp, gpa: Q.div(sem.qp, sem.credits) }
      : { sem, ...summarise(sem.courses) });
  const totalCredits = sumQ(semResults.map((r) => r.credits));
  const totalQP = sumQ(semResults.map((r) => r.qp));
  const cgpa = Q.div(totalQP, totalCredits);
  const scale = escapeHtml(data.scaleName);

  const steps = [{ title: "Grading scale", expression: scale }];
  semResults.forEach((r) => {
    const head = r.sem.mode === "totals"
      ? `Entered totals: ${formatRat(r.credits)} credit hours, ${formatRat(r.qp)} quality points`
      : courseLines(r.sem.courses);
    steps.push({
      title: escapeHtml(r.sem.name),
      expression: `${head}<br><strong>Credits = ${formatRat(r.credits)} · QP = ${formatRat(r.qp)} · SGPA = ${formatRat(r.qp)} ÷ ${formatRat(r.credits)} = ${formatRat(r.gpa)}</strong>`,
    });
  });
  steps.push(
    { title: "Total credit hours (all semesters)", expression: `${joinSum(semResults.map((r) => r.credits))} = ${formatRat(totalCredits)}` },
    { title: "Total quality points (all semesters)", expression: `${joinSum(semResults.map((r) => r.qp))} = ${formatRat(totalQP)}` },
    { title: "CGPA", expression: `CGPA = ${formatRat(totalQP)} ÷ ${formatRat(totalCredits)} = ${formatRat(cgpa)}` },
  );
  const details = [
    ...gpaFormulas("CGPA", " (all semesters)"),
    { label: "Semesters included", value: String(semResults.length) },
    ...semResults.map((r) => ({ label: escapeHtml(r.sem.name), value: `${formatRat(r.credits)} cr · ${formatRat(r.qp)} QP · SGPA ${formatRat(r.gpa)}` })),
    { label: "Total credit hours", value: formatRat(totalCredits) },
    { label: "Total quality points", value: formatRat(totalQP) },
    { label: "Grading scale", value: scale },
  ];
  return { result: formatRat(cgpa), unit: "", resultText: formatRat(cgpa), steps, details };
}

/* ---------- 3. Screen: HTML templates ---------- */

function gradeOptionsHtml(selected = "") {
  const grades = loadGradeScale().rows.map((r) => r.grade.trim()).filter(Boolean);
  return `<option value="">Select grade</option>` +
    grades.map((g) => `<option value="${escapeHtml(g)}"${g === selected ? " selected" : ""}>${escapeHtml(g)}</option>`).join("");
}

function scaleRowHtml(row, i) {
  return `
    <div class="gpa-scale-row" data-index="${i}">
      <input class="gpa-input" data-sk="grade" value="${escapeHtml(row.grade)}" aria-label="Grade name" placeholder="e.g. A" maxlength="8" autocomplete="off" />
      <input class="gpa-input" data-sk="points" value="${escapeHtml(row.points)}" aria-label="Grade points" inputmode="decimal" placeholder="e.g. 4" maxlength="12" autocomplete="off" />
      <button type="button" class="gpa-remove" data-action="remove-grade" aria-label="Remove grade">×</button>
    </div>`;
}

function scaleEditorHtml() {
  const state = loadGradeScale();
  return `
    <details class="gpa-scale">
      <summary>Grading scale <span class="gpa-scale-name">${escapeHtml(GRADE_PRESETS[state.preset].label)}</span></summary>
      <div class="gpa-scale-body">
        <div class="field-group">
          <label>Preset</label>
          <select data-role="preset">
            ${Object.entries(GRADE_PRESETS).map(([k, p]) => `<option value="${k}"${k === state.preset ? " selected" : ""}>${escapeHtml(p.label)}</option>`).join("")}
          </select>
        </div>
        <div class="gpa-scale-head"><span>Grade</span><span>Grade points</span><span></span></div>
        <div class="gpa-scale-rows">${state.rows.map(scaleRowHtml).join("")}</div>
        <button type="button" class="btn btn-secondary gpa-add" data-action="add-grade">+ Add grade</button>
        <p class="field-hint">Universities use different grade-point systems — choose a preset or edit the points to match yours. Your scale is saved in this browser.</p>
      </div>
    </details>`;
}

function courseRowHtml() {
  return `
    <div class="gpa-row">
      <div class="gpa-cell" data-label="Course name"><input class="gpa-input" data-k="name" placeholder="e.g. Calculus" aria-label="Course name" maxlength="60" autocomplete="off" /></div>
      <div class="gpa-cell" data-label="Credit hours"><input class="gpa-input" data-k="credits" inputmode="decimal" placeholder="e.g. 3" aria-label="Credit hours" maxlength="12" autocomplete="off" /></div>
      <div class="gpa-cell" data-label="Grade"><select class="gpa-input" data-k="grade" aria-label="Grade">${gradeOptionsHtml()}</select></div>
      <div class="gpa-cell gpa-calc" data-label="Grade points"><output data-k="gp">—</output></div>
      <div class="gpa-cell gpa-calc" data-label="Quality points"><output data-k="qp">—</output></div>
      <button type="button" class="gpa-remove" data-action="remove-course" aria-label="Remove course">×</button>
    </div>`;
}

function courseTableHtml(rows) {
  return `
    <div class="gpa-table">
      <div class="gpa-head" aria-hidden="true"><span>Course name</span><span>Credit hours</span><span>Grade</span><span>Grade points</span><span>Quality points</span><span></span></div>
      <div class="gpa-body">${Array.from({ length: rows }, courseRowHtml).join("")}</div>
    </div>
    <button type="button" class="btn btn-secondary gpa-add" data-action="add-course">+ Add course</button>`;
}

function semesterHtml(index) {
  return `
    <div class="gpa-sem">
      <div class="gpa-sem-head">
        <input class="gpa-input" data-k="semname" placeholder="Semester ${index}" aria-label="Semester name" maxlength="40" autocomplete="off" />
        <select class="gpa-input" data-k="mode" aria-label="How do you want to enter this semester?">
          <option value="courses">Course-wise</option>
          <option value="totals">Totals only</option>
        </select>
        <button type="button" class="gpa-remove" data-action="remove-sem" aria-label="Remove semester">×</button>
      </div>
      <div class="gpa-sem-courses">${courseTableHtml(2)}</div>
      <div class="gpa-sem-totals" hidden>
        <div class="gpa-totals-grid">
          <label>Credit hours<input class="gpa-input" data-k="tcredits" inputmode="decimal" placeholder="e.g. 15" maxlength="12" autocomplete="off" /></label>
          <label>Quality points<input class="gpa-input" data-k="tqp" inputmode="decimal" placeholder="e.g. 48.5" maxlength="12" autocomplete="off" /></label>
        </div>
      </div>
    </div>`;
}

/* ---------- 3b. Screen: reading values back ---------- */

// Updates the "grade points" and "quality points" cells of one course row as the visitor types.
function refreshCourseRow(row) {
  let scale = null;
  try { scale = parseGradeScale(); } catch (e) { scale = null; }
  const grade = row.querySelector('[data-k="grade"]').value;
  const rawCredits = row.querySelector('[data-k="credits"]').value.trim().replace(/,/g, "");
  const entry = scale && scale.map.get(grade);
  row.querySelector('[data-k="gp"]').textContent = entry ? formatRat(entry.points) : "—";
  row.querySelector('[data-k="qp"]').textContent = entry && NUMBER_TEXT.test(rawCredits)
    ? formatRat(Q.mul(Q.from(Number(rawCredits)), entry.points))
    : "—";
}

// Reads + validates every row of one course table. Fully blank rows are ignored.
function readCourseTable(wrap, scale, prefix) {
  const courses = [];
  wrap.querySelectorAll(".gpa-row").forEach((row, i) => {
    const name = row.querySelector('[data-k="name"]').value.trim();
    const rawCredits = row.querySelector('[data-k="credits"]').value;
    const grade = row.querySelector('[data-k="grade"]').value;
    if (!name && !rawCredits.trim() && !grade) return;
    const where = `${prefix}Course ${i + 1}`;
    const credits = readDecimal(rawCredits, `${where}: credit hours`, { positive: true, max: 30 });
    if (!grade) throw new Error(`${where}: choose a grade.`);
    const entry = scale.map.get(grade);
    if (!entry) throw new Error(`${where}: grade "${grade}" is not in the grading scale.`);
    courses.push({ name: name || `Course ${i + 1}`, credits, gradeLabel: grade, gp: entry.points, qp: Q.mul(credits, entry.points) });
  });
  return courses;
}

/* ---------- 3c. Screen: the interface for one calculator ---------- */

// kind = "gpa" | "sgpa" | "cgpa". Returns { mount(box), collect() } as calculator-engine.js expects.
function makeGpaUI(kind) {
  let root = null;
  const q = (sel) => root.querySelector(sel);
  const redrawScaleRows = () => { q(".gpa-scale-rows").innerHTML = loadGradeScale().rows.map(scaleRowHtml).join(""); };
  const refreshAllRows = () => root.querySelectorAll(".gpa-row").forEach(refreshCourseRow);

  // After the scale changes: rebuild every grade dropdown, keeping the chosen grade when it still exists.
  const rebuildGradeSelects = () => {
    root.querySelectorAll('select[data-k="grade"]').forEach((sel) => {
      const keep = sel.value;
      sel.innerHTML = gradeOptionsHtml(keep);
      if (![...sel.options].some((o) => o.value === keep)) sel.value = "";
    });
    refreshAllRows();
  };
  const syncScaleUI = () => {
    const state = loadGradeScale();
    q(".gpa-scale-name").textContent = GRADE_PRESETS[state.preset].label;
    q('[data-role="preset"]').value = state.preset;
  };
  const renumberSemesters = () => root.querySelectorAll(".gpa-sem").forEach((sem, i) => {
    sem.querySelector('[data-k="semname"]').placeholder = `Semester ${i + 1}`;
  });
  // Any edit of the scale switches the preset to "custom" and saves it.
  const editScale = (change) => { const state = loadGradeScale(); change(state); state.preset = "custom"; saveGradeScale(); };

  const actions = {
    "add-course": (btn) => {
      const body = btn.parentElement.querySelector(".gpa-body");
      if (body.children.length < GPA_LIMITS.courseRows) body.insertAdjacentHTML("beforeend", courseRowHtml());
    },
    "remove-course": (btn) => {
      const row = btn.closest(".gpa-row");
      if (row.parentElement.children.length > 1) row.remove();
      else row.querySelectorAll("input,select").forEach((el) => { el.value = ""; refreshCourseRow(row); }); // last row: just clear it
    },
    "add-sem": () => {
      const list = q(".gpa-sem-list");
      if (list.children.length >= GPA_LIMITS.semesters) return;
      list.insertAdjacentHTML("beforeend", semesterHtml(list.children.length + 1));
      renumberSemesters();
    },
    "remove-sem": (btn) => {
      if (q(".gpa-sem-list").children.length > 1) { btn.closest(".gpa-sem").remove(); renumberSemesters(); }
    },
    "add-grade": () => {
      if (loadGradeScale().rows.length >= GPA_LIMITS.scaleRows) return;
      editScale((state) => state.rows.push({ grade: "", points: "" }));
      redrawScaleRows();
      syncScaleUI();
      const inputs = root.querySelectorAll('.gpa-scale-row [data-sk="grade"]');
      inputs[inputs.length - 1].focus();
    },
    "remove-grade": (btn) => {
      const idx = Number(btn.closest(".gpa-scale-row").dataset.index);
      if (loadGradeScale().rows.length <= 1) return;
      editScale((state) => state.rows.splice(idx, 1));
      redrawScaleRows();
      syncScaleUI();
      rebuildGradeSelects();
    },
  };

  const onClick = (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn && Object.hasOwn(actions, btn.dataset.action)) actions[btn.dataset.action](btn);
  };

  const onInput = (e) => {
    const t = e.target;
    if (t.dataset.sk) { // typing in the grading-scale editor
      const idx = Number(t.closest(".gpa-scale-row").dataset.index);
      editScale((state) => { state.rows[idx][t.dataset.sk] = t.value; });
      syncScaleUI();
      refreshAllRows();
      return;
    }
    const row = t.closest(".gpa-row");
    if (row) refreshCourseRow(row);
  };

  const onChange = (e) => {
    const t = e.target;
    if (t.dataset.role === "preset") { // picked a preset
      const state = loadGradeScale();
      state.preset = Object.hasOwn(GRADE_PRESETS, t.value) ? t.value : "custom";
      if (GRADE_PRESETS[state.preset].rows) state.rows = cloneScaleRows(GRADE_PRESETS[state.preset].rows);
      saveGradeScale();
      redrawScaleRows();
      syncScaleUI();
      rebuildGradeSelects();
    } else if (t.dataset.sk === "grade") {
      rebuildGradeSelects();
    } else if (t.dataset.k === "mode") { // semester: "Course-wise" <-> "Totals only"
      const sem = t.closest(".gpa-sem");
      const totals = t.value === "totals";
      sem.querySelector(".gpa-sem-courses").hidden = totals;
      sem.querySelector(".gpa-sem-totals").hidden = !totals;
    } else if (t.closest(".gpa-row")) {
      refreshCourseRow(t.closest(".gpa-row"));
    }
  };

  return {
    mount(box) {
      let body;
      if (kind === "cgpa") {
        body = `
          <div class="gpa-sem-list">${semesterHtml(1)}${semesterHtml(2)}</div>
          <button type="button" class="btn btn-secondary gpa-add" data-action="add-sem">+ Add semester</button>`;
      } else {
        body = `
          ${kind === "sgpa" ? `<div class="field-group"><label>Semester name (optional)</label><input class="gpa-input gpa-input-full" data-k="semname" placeholder="e.g. Fall 2026" maxlength="40" autocomplete="off" /></div>` : ""}
          <div class="gpa-single">${courseTableHtml(4)}</div>`;
      }
      box.innerHTML = `<div class="gpa-ui">${body}${scaleEditorHtml()}</div>`;
      root = box.firstElementChild;
      root.addEventListener("click", onClick);
      root.addEventListener("input", onInput);
      root.addEventListener("change", onChange);
    },

    // Reads + validates every input. Throws an Error with a friendly message.
    collect() {
      const scale = parseGradeScale();
      const semesters = [];
      if (kind === "cgpa") {
        root.querySelectorAll(".gpa-sem").forEach((sem, i) => {
          const name = sem.querySelector('[data-k="semname"]').value.trim() || `Semester ${i + 1}`;
          const prefix = `${name} · `;
          if (sem.querySelector('[data-k="mode"]').value === "totals") {
            const credits = readDecimal(sem.querySelector('[data-k="tcredits"]').value, `${prefix}credit hours`, { positive: true, max: 200 });
            const qp = readDecimal(sem.querySelector('[data-k="tqp"]').value, `${prefix}quality points`, { max: 2000 });
            if (Q.cmp(qp, Q.mul(credits, scale.max)) > 0) {
              throw new Error(`${prefix}quality points cannot be more than credit hours × the highest grade point (${formatRat(scale.max)}).`);
            }
            semesters.push({ name, mode: "totals", credits, qp });
          } else {
            const courses = readCourseTable(sem.querySelector(".gpa-sem-courses"), scale, prefix);
            if (!courses.length) throw new Error(`${name}: add at least one course with credit hours and a grade, or switch it to "Totals only".`);
            semesters.push({ name, mode: "courses", courses });
          }
        });
      } else {
        const courses = readCourseTable(q(".gpa-single"), scale, "");
        if (!courses.length) throw new Error("Add at least one course with credit hours and a grade.");
        const nameEl = q('[data-k="semname"]');
        semesters.push({ name: nameEl ? nameEl.value.trim() : "", mode: "courses", courses });
      }
      return { scaleName: scale.name, semesters };
    },
  };
}
