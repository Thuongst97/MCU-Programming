/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — memory-map / linker visualizer (PLAN.md §9.7).
   MCU.MemoryMap(host, { map: "00-bluepill-blink-uart", compare?: "00-…-hal" })
   Data: window.MCU_DATA.memmap[name], generated from the CI-built ELF by
   tools/elf2memmap.py. Draws FLASH and RAM at true scale (small sections get
   a minimum width), lists sections and symbols, and steps through what the
   startup code does: copy .data from flash to RAM, zero .bss, set SP, main().
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MCU = root.MCU || {};
    root.MCU.MemoryMap = api.mount;
    root.MCU.MemoryMap.summarize = api.summarize;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex = (v) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(n % 1024 ? 2 : 0) + " KB" : n + " B");

  /** Flash/RAM usage the way `arm-none-eabi-size` reports it (text+data in flash, data+bss(+stack) in RAM). */
  function summarize(m) {
    const region = (name) => m.regions.find((r) => r.name === name);
    const inRegion = (addr, r) => addr >= r.origin && addr < r.origin + r.length;
    const flash = region("FLASH"), ram = region("RAM");
    let flashUsed = 0, ramUsed = 0;
    m.sections.forEach((s) => {
      if (s.load && inRegion(s.lma, flash)) flashUsed += s.size;
      if (inRegion(s.vma, ram)) ramUsed += s.size;
    });
    return { flash, ram, flashUsed, ramUsed, flashPct: (100 * flashUsed) / flash.length, ramPct: (100 * ramUsed) / ram.length };
  }

  const KIND = (name) => (/isr_vector/.test(name) ? "vec" : /text|rodata|init|fini|exidx/.test(name) ? "text" : /^\.data/.test(name) ? "data" : /bss/.test(name) ? "bss" : /heap|stack/.test(name) ? "stack" : "other");

  function bar(region, items, W, y, label) {
    const X0 = 110, BW = W - X0 - 20, H = 46;
    const scale = BW / region.length;
    let s = `<text class="mm-rlabel" x="10" y="${y + 20}">${esc(label)}</text><text class="mm-raddr" x="10" y="${y + 36}">${hex(region.origin)}</text>`;
    s += `<rect class="mm-region" x="${X0}" y="${y}" width="${BW}" height="${H}" rx="6"/>`;
    let cursor = X0;
    items.forEach((it) => {
      let x = X0 + (it.addr - region.origin) * scale;
      x = Math.max(x, cursor);
      const w = Math.max(it.size * scale, 10);
      cursor = x + w + 1;
      s += `<g class="mm-sec k-${it.kind}${it.cls ? " " + it.cls : ""}" data-sec="${esc(it.id)}" tabindex="0" data-tip="${esc(`${it.name} — ${kb(it.size)} at ${hex(it.addr)}${it.note ? " · " + it.note : ""}`)}">`;
      s += `<rect x="${x}" y="${y + 3}" width="${w}" height="${H - 6}" rx="4"/>`;
      if (w > it.name.length * 6.3 + 6) s += `<text x="${x + w / 2}" y="${y + H / 2 + 4}" text-anchor="middle">${esc(it.name)}</text>`;
      s += `</g>`;
      it.x = x; it.w = w;
    });
    s += `<text class="mm-raddr" x="${X0 + BW}" y="${y + H + 14}" text-anchor="end">${hex(region.origin + region.length)} · ${kb(region.length)}</text>`;
    return s;
  }

  function mount(host, opts) {
    const S = window.MCU_STRINGS.memmap;
    const m = window.MCU_DATA.memmap && window.MCU_DATA.memmap[opts.map];
    if (!m) throw new Error(`MemoryMap: no data for "${opts.map}" (load assets/js/data/memmap/${opts.map}.js)`);
    const sum = summarize(m);
    const W = 900;
    const sym = (n) => (m.symbols.find((x) => x.name === n) || {}).value;
    const flashItems = m.sections.filter((s) => s.load && s.lma >= sum.flash.origin && s.lma < sum.flash.origin + sum.flash.length)
      .map((s) => ({ id: "f" + s.name, name: s.vma !== s.lma ? `${s.name} (load copy)` : s.name, addr: s.lma, size: s.size, kind: KIND(s.name), note: s.vma !== s.lma ? S.loadCopy : "" }));
    const ramItems = m.sections.filter((s) => s.vma >= sum.ram.origin && s.vma < sum.ram.origin + sum.ram.length)
      .map((s) => ({ id: "r" + s.name, name: s.name, addr: s.vma, size: s.size, kind: KIND(s.name) }));
    const estack = sym("_estack");
    let svg = `<defs><marker id="${opts.map}-mm-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="mm-ah"/></marker></defs>`;
    svg += bar(sum.flash, flashItems, W, 18, "FLASH");
    svg += bar(sum.ram, ramItems, W, 150, "RAM");
    const dataF = flashItems.find((i) => i.id === "f.data"), dataR = ramItems.find((i) => i.id === "r.data"), bssR = ramItems.find((i) => i.id === "r.bss");
    if (dataF && dataR) svg += `<path class="mm-copy" d="M${dataF.x + dataF.w / 2},${18 + 46} C${dataF.x + dataF.w / 2},110 ${dataR.x + dataR.w / 2},110 ${dataR.x + dataR.w / 2},150" marker-end="url(#${opts.map}-mm-ah)"/>`;
    if (estack) {
      const X0 = 110, BW = W - 130, x = X0 + ((estack - sum.ram.origin) / sum.ram.length) * BW;
      svg += `<g class="mm-sp"><line x1="${x}" y1="140" x2="${x}" y2="206"/><text x="${x - 4}" y="224" text-anchor="end">_estack = ${hex(estack)} ↓ ${S.stackGrows}</text></g>`;
    }
    const steps = [
      { sel: [], text: S.steps[0] },
      { sel: ["f.isr_vector"], text: S.steps[1](hex(sym("_estack") || 0)) },
      { sel: ["f.data", "r.data"], cls: "copying", text: S.steps[2](dataR ? dataR.size : 0) },
      { sel: ["r.bss"], text: S.steps[3](bssR ? bssR.size : 0) },
      { sel: ["f.text"], text: S.steps[4] },
    ];
    host.classList.add("mm-host", "glass");
    host.innerHTML = `<div class="mm-stats">
        <span>${S.flashUse} <b>${kb(sum.flashUsed)}</b> / ${kb(sum.flash.length)} <i style="--p:${sum.flashPct.toFixed(1)}%"></i> ${sum.flashPct.toFixed(1)} %</span>
        <span>${S.ramUse} <b>${kb(sum.ramUsed)}</b> / ${kb(sum.ram.length)} <i style="--p:${sum.ramPct.toFixed(1)}%"></i> ${sum.ramPct.toFixed(1)} %</span>
        <span class="muted small">${esc(m.elf)} · ${esc(m.toolchain.replace(/\s*\(.*?\)/, ""))}</span>
      </div>
      <div class="mm-canvas"><svg viewBox="0 0 ${W} 236" role="img" aria-label="${S.aria(m.elf)}">${svg}</svg></div>
      <div class="mm-legend">${["vec", "text", "data", "bss", "stack"].map((k) => `<span class="k-${k}"><i></i>${S.kinds[k]}</span>`).join("")}</div>
      <div class="mm-step"><div class="mm-step-ctl"><button type="button" class="btn sm" data-act="prev">${S.prev}</button><button type="button" class="btn sm primary" data-act="next">${S.next}</button><span class="mm-count small muted"></span></div><p class="mm-step-text"></p></div>
      <details class="mm-details"><summary>${S.details}</summary>
        <div class="table-wrap"><table class="t"><thead><tr><th>${S.section}</th><th>VMA</th><th>LMA</th><th>${S.size}</th></tr></thead><tbody>
        ${m.sections.map((s) => `<tr><td><code>${esc(s.name)}</code></td><td><code>${hex(s.vma)}</code></td><td><code>${hex(s.lma)}</code></td><td>${s.size} B</td></tr>`).join("")}
        </tbody></table></div>
        <div class="table-wrap"><table class="t"><thead><tr><th>${S.symbol}</th><th>${S.value}</th></tr></thead><tbody>
        ${m.symbols.map((s) => `<tr><td><code>${esc(s.name)}</code></td><td><code>${hex(s.value)}</code></td></tr>`).join("")}
        </tbody></table></div>
        ${m.largest_functions && m.largest_functions.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>${S.largest}</th><th>${S.size}</th></tr></thead><tbody>${m.largest_functions.map((f) => `<tr><td><code>${esc(f.name)}</code></td><td>${f.size} B</td></tr>`).join("")}</tbody></table></div>` : ""}
      </details>`;
    let cur = 0;
    const show = () => {
      const st = steps[cur];
      host.querySelectorAll(".mm-sec").forEach((g) => { g.classList.toggle("on", st.sel.includes(g.dataset.sec)); g.classList.toggle("dim", st.sel.length > 0 && !st.sel.includes(g.dataset.sec)); });
      const copy = host.querySelector(".mm-copy");
      if (copy) copy.classList.toggle("on", st.cls === "copying");
      host.querySelector(".mm-step-text").innerHTML = st.text;
      host.querySelector(".mm-count").textContent = `${cur + 1} / ${steps.length}`;
    };
    host.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (!a) return;
      cur = Math.max(0, Math.min(steps.length - 1, cur + (a.dataset.act === "next" ? 1 : -1)));
      show();
    });
    show();
    return { summary: sum, go(i) { cur = i; show(); } };
  }

  return { mount, summarize };
});
