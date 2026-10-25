/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — "You are done when…" checklist (PLAN.md §9.9).
   MCU.Checklist(host, items, { key })
     items: ["text or html", …]; progress is kept per page in localStorage
     under "mcu-done-<key>" (wrapped in try/catch: works without storage too).
   ========================================================================= */
(function () {
  "use strict";
  const MCU = (window.MCU = window.MCU || {});
  MCU.Checklist = function (host, items, opts = {}) {
    const S = window.MCU_STRINGS.checklist;
    const key = "mcu-done-" + (opts.key || document.body.dataset.page || "page");
    const load = () => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; } };
    const save = (v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
    let done = new Set(load());
    const id = key.replace(/[^a-z0-9-]/gi, "");
    host.classList.add("ck-host", "glass");
    host.innerHTML = `<div class="ck-head"><b>${S.title}</b><span class="ck-count small"></span><button type="button" class="btn sm ghost" data-act="reset">${S.reset}</button></div>
      <div class="ck-bar"><div></div></div>
      <ul class="ck-list">${items.map((t, i) => `<li><input type="checkbox" id="${id}-${i}" data-i="${i}"><label for="${id}-${i}">${t}</label></li>`).join("")}</ul>
      <p class="ck-done small" hidden>${S.allDone}</p>`;
    const render = () => {
      host.querySelectorAll("input[data-i]").forEach((c) => { c.checked = done.has(+c.dataset.i); c.closest("li").classList.toggle("on", c.checked); });
      host.querySelector(".ck-count").textContent = S.count(done.size, items.length);
      host.querySelector(".ck-bar > div").style.width = (100 * done.size) / items.length + "%";
      host.querySelector(".ck-done").hidden = done.size !== items.length;
    };
    host.addEventListener("change", (e) => {
      const i = e.target.dataset && e.target.dataset.i;
      if (i === undefined) return;
      if (e.target.checked) done.add(+i); else done.delete(+i);
      save([...done]); render();
    });
    host.querySelector('[data-act="reset"]').addEventListener("click", () => { done = new Set(); save([]); render(); });
    render();
    return { get done() { return [...done]; } };
  };
})();
