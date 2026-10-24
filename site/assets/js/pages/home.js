/* SPDX-License-Identifier: MIT
   Landing page: module grid generated from SITE, grouped by level. */
(function () {
  "use strict";
  const { SITE, STRINGS: S, esc, isReady } = window.MCU;
  const host = document.getElementById("module-grid");
  if (!host) return;
  const groups = [];
  SITE.forEach((p) => {
    let g = groups.find((x) => x.name === p.group);
    if (!g) groups.push((g = { name: p.group, pages: [] }));
    g.pages.push(p);
  });
  const card = (p) => {
    const ready = isReady(p);
    const inner = `
      <div class="mc-top"><div class="mc-icon" aria-hidden="true">${p.icon}</div>${ready ? `<span class="badge gray mono">${esc(p.num)}</span>` : `<span class="badge gray">${esc(S.status.planned(p.phase))}</span>`}</div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.desc)}</p>
      <div class="mc-tags">${p.sections.slice(0, 3).map((s) => `<span class="chip">${esc(s[1])}</span>`).join("")}</div>
      <span class="mc-go">${esc(ready ? S.status.ready : S.status.soon)}</span>`;
    return ready
      ? `<a class="module-card glass" href="${p.file}" style="--accent:${p.accent}">${inner}</a>`
      : `<div class="module-card glass is-planned" style="--accent:${p.accent}">${inner}</div>`;
  };
  host.innerHTML = groups.map((g) => `
    <div class="mod-group"><h3>${esc(g.name)}</h3><span>${esc(S.status.pageCount(g.pages.length))}</span></div>
    <div class="grid grid-3">${g.pages.map(card).join("")}</div>`).join("");
})();
