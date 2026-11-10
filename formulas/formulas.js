/* =====================================================================
   formulas.js — builds the "Formulas & definitions" page.
   Nothing to edit here: it lists every calculator of every category found in
   shared/js/site-config.js, using the data in calculators/<name>/<name>.js.
   Add or change a calculator there and this page updates by itself.
   ===================================================================== */
document.getElementById("formulas-list").innerHTML = SITE.categories
  .map(([slug, label]) => `
    <div class="formulas-group">
      <h2>${label}</h2>
      <p><a href="${siteUrl(`calculators/${slug}/`)}">Open ${label} calculators →</a></p>
      ${Object.values(CATEGORIES[slug].subcategories).map((sub) => `
        <div class="formula-row">
          <span class="name">${sanitizeHtml(sub.label)}</span>
          <span class="expr">${sanitizeHtml(sub.formula)}</span>
          <span class="def">${sanitizeHtml(sub.definition)}</span>
        </div>`).join("")}
    </div>`)
  .join("");
