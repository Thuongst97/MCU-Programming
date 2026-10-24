/* SPDX-License-Identifier: MIT
   Glossary page: filterable term cards from window.GLOSSARY, with stable #g-<slug> anchors
   (global search links to them). */
(function () {
  "use strict";
  const { $, $$, esc, norm, slug, STRINGS } = window.MCU;
  const T = STRINGS.glossary;
  const terms = (window.GLOSSARY || []).slice().sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
  const input = $("#g-search"), cats = $("#g-cats"), grid = $("#g-grid"), count = $("#g-count");
  let cat = "all";

  input.placeholder = T.searchPlaceholder;
  input.setAttribute("aria-label", T.searchLabel);
  cats.setAttribute("aria-label", T.filterLabel);
  const used = new Set(terms.map((t) => t.cat));
  cats.innerHTML = [["all", T.all], ...Object.entries(T.cats).filter(([k]) => used.has(k))]
    .map(([k, v]) => `<button type="button" class="gloss-cat" data-c="${k}" aria-pressed="${k === "all"}">${esc(v)}</button>`).join("");
  $("#g-total").textContent = T.total(terms.length);

  const card = (g) => `<article class="gloss-item glass" id="g-${slug(g.term)}">
      <h3>${esc(g.term)}</h3>
      <div class="gx">${esc(g.full)} <span class="badge gray">${esc(T.cats[g.cat] || g.cat)}</span></div>
      <p>${esc(g.desc).replace(/`([^`]+)`/g, "<code>$1</code>")}</p></article>`;

  function render() {
    const q = norm(input.value.trim());
    const list = terms.filter((g) => (cat === "all" || g.cat === cat) && (!q || norm(`${g.term} ${g.full} ${g.desc}`).includes(q)));
    grid.innerHTML = list.map(card).join("");
    count.textContent = T.count(list.length, terms.length);
  }
  cats.addEventListener("click", (e) => {
    const b = e.target.closest(".gloss-cat");
    if (!b) return;
    cat = b.dataset.c;
    $$(".gloss-cat", cats).forEach((x) => x.setAttribute("aria-pressed", x === b));
    render();
  });
  input.addEventListener("input", render);
  render();

  // deep link from global search: #g-<term> — reset filters so the card exists, then scroll to it
  const jump = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id.startsWith("g-")) return;
    if (!document.getElementById(id)) { input.value = ""; cat = "all"; $$(".gloss-cat", cats).forEach((x) => x.setAttribute("aria-pressed", x.dataset.c === "all")); render(); }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "center" });
  };
  window.addEventListener("hashchange", jump);
  if (location.hash) setTimeout(jump, 0);
})();
