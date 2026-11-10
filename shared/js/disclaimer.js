/* =====================================================================
   disclaimer.js — a small "before you use this" pop-up.
   Loaded ONLY by the Health and Finance calculator pages (one <script> tag at the bottom of each page).
   - Shown once per browser tab: it remembers "seen" in sessionStorage (forgotten when the tab closes).
   - Closes with the button, the Esc key or a click outside the box.
   - To show it on another page: add MESSAGES.<category> below (the key is that page's data-category)
     and add <script src="../../shared/js/disclaimer.js"></script> to the page.
   SECURITY: text is added with textContent (never innerHTML); the icons are fixed strings in this file.
   ===================================================================== */
(function () {
  const SCRIPT_SRC = document.currentScript && document.currentScript.src;

  const ICONS = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4z"></path></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2s1 1.7 2.8 2 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.3-.4-2.8-1.2M12 6.5V8m0 8v1.5"></path></svg>',
  };

  const MESSAGES = {
    health: {
      icon: "heart",
      title: "Estimates, not medical advice",
      text: "These calculators give general estimates for learning and information. They can't diagnose or treat any condition. Please talk to a doctor or dietitian before you change your diet, exercise or medicines.",
    },
    finance: {
      icon: "coin",
      title: "Estimates, not financial advice",
      text: "Results are for planning and learning. Banks and tax offices may use different fees, rules and rounding, so please confirm important figures with them before you decide.",
    },
  };

  const app = document.getElementById("calculator-app");
  const category = app && app.dataset.category;
  const message = category && Object.prototype.hasOwnProperty.call(MESSAGES, category) ? MESSAGES[category] : null;
  if (!message) return;

  const storeKey = "humpy-disclaimer-" + category;
  try { if (sessionStorage.getItem(storeKey)) return; } catch (e) { /* storage blocked: just show it */ }

  const termsUrl = SCRIPT_SRC ? new URL("../../terms/", SCRIPT_SRC).href : "";
  const opener = document.activeElement;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const backdrop = el("div", "disclaimer-backdrop");
  const dialog = el("div", "disclaimer-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "disclaimer-title");
  dialog.setAttribute("aria-describedby", "disclaimer-text");

  const icon = el("div", "disclaimer-icon");
  icon.innerHTML = ICONS[message.icon]; // fixed string from this file, not user input
  const title = el("h2", "", message.title); title.id = "disclaimer-title";
  const text = el("p", "", message.text); text.id = "disclaimer-text";
  const button = el("button", "btn btn-primary", "I understand");
  button.type = "button";
  dialog.append(icon, title, text, button);

  let link = null;
  if (termsUrl) {
    link = el("a", "disclaimer-link", "Read the Terms of Use");
    link.href = termsUrl;
    dialog.append(link);
  }
  backdrop.append(dialog);

  function close() {
    try { sessionStorage.setItem(storeKey, "1"); } catch (e) { /* ignore */ }
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("has-disclaimer");
    backdrop.remove();
    if (opener && typeof opener.focus === "function") opener.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") { // keep keyboard focus inside the pop-up
      const items = link ? [button, link] : [button];
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
    }
  }

  button.addEventListener("click", close);
  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey);
  document.documentElement.classList.add("has-disclaimer");
  document.body.append(backdrop);
  button.focus();
})();
