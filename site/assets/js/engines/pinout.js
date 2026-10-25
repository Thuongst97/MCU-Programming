/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — pinout engine (PLAN.md §9.2).
   MCU.Pinout(host, { board: "bluepill", mode, highlight, wiring, labels })
     mode: "functions" | "electrical" | "wiring"
     highlight: ["PA9", "PA10"]           pins used on this page
     labels: { PA9: "USART1_TX" }         function shown next to a pin
     wiring: [{ pin: "A9", to: "usbuart.RX", kind: "signal"|"power"|"ground" }]
   The SVG is built by a pure function, render(data, opts), which
   tools/export-wiring.mjs also runs in Node to write examples/NN-…/wiring.svg,
   so a wiring diagram can never disagree with the pin data.
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MCU = root.MCU || {};
    root.MCU.Pinout = api.mount;
    root.MCU.Pinout.render = api.render;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const G = { W: 980, BX: 380, BW: 220, TOP: 128, PITCH: 27, LABEL_GAP: 14 };

  /** Header label ("A9", "5V") → pin key in data.pins ("PA9") or data.power ("5V"). */
  function keyOf(data, label) {
    if (data.pins["P" + label]) return "P" + label;
    if (label === "SWDIO") return "PA13";
    if (label === "SWCLK") return "PA14";
    return label;
  }
  function category(data, key) {
    if (data.pins[key]) return data.pins[key].ft ? "ft" : "nft";
    const p = data.power[key];
    return p ? p.kind : "power";
  }

  /** Geometry of every header pin: [{label, key, side, x, y}] */
  function layoutPins(data) {
    const out = [];
    const H = data.headers;
    H.left.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "left", x: G.BX + 18, y: G.TOP + i * G.PITCH }));
    H.right.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "right", x: G.BX + G.BW - 18, y: G.TOP + i * G.PITCH }));
    const sy = G.TOP + H.left.length * G.PITCH + 22;
    const SP = 44; // wider pitch so the SWD labels fit
    const sx0 = G.BX + G.BW / 2 - ((H.swd.length - 1) * SP) / 2;
    H.swd.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "swd", swd: true, x: sx0 + i * SP, y: sy }));
    return out;
  }

  /**
   * Pure SVG builder. opts: { mode, highlight, labels, wiring, query, selected, standalone, title }
   * Returns { svg, height }.
   */
  function render(data, opts = {}) {
    const mode = opts.mode || "functions";
    const hl = new Set(opts.highlight || []);
    const q = (opts.query || "").trim().toLowerCase();
    const pins = layoutPins(data);
    const boardH = G.TOP + data.headers.left.length * G.PITCH + 54 - 70;
    const boardY = 70;
    let s = "";

    // board outline, USB, chip, crystal, jumpers, LED
    s += `<rect class="po-board" x="${G.BX}" y="${boardY}" width="${G.BW}" height="${boardH}" rx="10"/>`;
    s += `<rect class="po-usb" x="${G.BX + G.BW / 2 - 26}" y="${boardY - 16}" width="52" height="26" rx="4"/><text class="po-usb-lbl" x="${G.BX + G.BW / 2}" y="${boardY - 22}" text-anchor="middle">micro-USB</text>`;
    const cx = G.BX + G.BW / 2, cy = G.TOP + 8.5 * G.PITCH;
    s += `<g transform="rotate(45 ${cx} ${cy})"><rect class="po-chip" x="${cx - 46}" y="${cy - 46}" width="92" height="92" rx="4"/></g>`;
    s += `<text class="po-chip-lbl" x="${cx}" y="${cy - 2}" text-anchor="middle">STM32F103</text><text class="po-chip-sub" x="${cx}" y="${cy + 12}" text-anchor="middle">C8T6 · LQFP48</text>`;
    s += `<rect class="po-xtal" x="${cx - 18}" y="${G.TOP + 3.2 * G.PITCH}" width="36" height="14" rx="7"/><text class="po-part-lbl" x="${cx}" y="${G.TOP + 3.2 * G.PITCH - 5}" text-anchor="middle">8 MHz</text>`;
    const jy = G.TOP + 13.4 * G.PITCH;
    ["BOOT0", "BOOT1"].forEach((b, i) => {
      const jx = cx - 30 + i * 60;
      s += `<g class="po-jumper"><rect x="${jx - 14}" y="${jy}" width="28" height="12" rx="3"/><circle cx="${jx - 7}" cy="${jy + 6}" r="2.4"/><circle cx="${jx}" cy="${jy + 6}" r="2.4"/><circle cx="${jx + 7}" cy="${jy + 6}" r="2.4"/></g>`;
      s += `<text class="po-part-lbl" x="${jx}" y="${jy + 25}" text-anchor="middle">${b}</text>`;
    });
    const ly = G.TOP + 16.6 * G.PITCH;
    s += `<g class="po-led"><rect x="${cx - 8}" y="${ly}" width="16" height="9" rx="2"/></g><text class="po-part-lbl" x="${cx}" y="${ly + 22}" text-anchor="middle">LED PC13 (active-low)</text>`;
    s += `<text class="po-part-lbl" x="${cx}" y="${G.TOP + data.headers.left.length * G.PITCH + 4}" text-anchor="middle">SWD header</text>`;

    // pins (collected separately so wires can be drawn underneath them)
    let pinSvg = "", wireSvg = "", partSvg = "";
    pins.forEach((p) => {
      const info = data.pins[p.key];
      const cat = category(data, p.key);
      const fn = (opts.labels && opts.labels[p.key]) || "";
      const text = [p.key, p.label, ...(info ? [...info.af, ...info.remap] : [])].join(" ").toLowerCase();
      const match = q && text.includes(q);
      const cls = ["po-pin", "c-" + cat, hl.has(p.key) ? "hl" : "", match ? "match" : "", opts.selected === p.key ? "sel" : "", info && info.warn ? "warn" : ""].filter(Boolean).join(" ");
      const name = info ? p.key : p.label;
      const tip = info ? `${p.key} — ${info.af.join(", ")}` : `${p.label} — ${(data.power[p.key] || {}).notes || ""}`;
      pinSvg += `<g class="${cls}" data-pin="${esc(p.key)}" tabindex="0" role="button" aria-label="${esc(name + (fn ? ", " + fn : ""))}" data-tip="${esc(tip)}">`;
      pinSvg += `<circle class="po-dot" cx="${p.x}" cy="${p.y}" r="6.5"/>`;
      if (p.side === "swd") {
        pinSvg += `<text class="po-name po-swd" x="${p.x}" y="${p.y + 22}" text-anchor="middle">${esc(p.label)}</text>`;
      } else {
        const left = p.side === "left";
        const nx = left ? G.BX - G.LABEL_GAP : G.BX + G.BW + G.LABEL_GAP;
        const w = name.length * 7.6 + 14;
        const rx = left ? nx - w : nx;
        pinSvg += `<rect class="po-tag" x="${rx}" y="${p.y - 10}" width="${w}" height="20" rx="5"/>`;
        pinSvg += `<text class="po-name" x="${rx + w / 2}" y="${p.y + 4}" text-anchor="middle">${esc(name)}</text>`;
        const fx = left ? rx - 8 : rx + w + 8;
        const ftxt = fn || (mode === "electrical" ? ({ ft: "5 V tolerant", nft: "3.3 V only", power: "power", ground: "ground", control: "reset" }[cat]) : info ? info.af[0] : "");
        if (ftxt && mode !== "wiring") pinSvg += `<text class="po-fn" x="${fx}" y="${p.y + 4}" text-anchor="${left ? "end" : "start"}">${esc(ftxt)}</text>`;
      }
      pinSvg += `</g>`;
    });

    // wiring: parts on the side of their first connection, wires routed in lanes
    let height = boardY + boardH + 60;
    if (mode === "wiring" && opts.wiring && opts.wiring.length) {
      const byPart = {};
      opts.wiring.forEach((w, i) => {
        const dot = w.to.indexOf("."), part = w.to.slice(0, dot), ppin = w.to.slice(dot + 1);
        // "swd:GND", "left:GND", "right:3V3" pick one of several header pins with the same name
        const [where, name] = w.pin.includes(":") ? w.pin.split(":") : [null, w.pin];
        const p = pins.find((x) => (x.label === name || x.key === name) && (!where || x.side === where));
        if (!p) throw new Error(`Pinout wiring: unknown pin ${w.pin}`);
        (byPart[part] = byPart[part] || { part, wires: [] }).wires.push({ ...w, i, ppin, p });
      });
      const sides = { left: [], right: [] };
      Object.values(byPart).forEach((g) => {
        const ys = g.wires.map((w) => w.p.y);
        g.side = g.wires[0].p.side === "left" ? "left" : "right";
        g.y = Math.min(...ys);
        sides[g.side].push(g);
      });
      const laneUse = { left: 0, right: 0 };
      ["left", "right"].forEach((side) => {
        let next = 70;
        sides[side].sort((a, b) => a.y - b.y).forEach((g) => {
          const def = data.parts[g.part] || { title: g.part, pins: [...new Set(g.wires.map((w) => w.ppin))] };
          const ph = 18;
          const h = 34 + def.pins.length * ph;
          const y = Math.max(next, g.y - 30);
          const x = side === "left" ? 16 : G.W - 196;
          next = y + h + 16;
          partSvg += `<g class="po-ext"><rect x="${x}" y="${y}" width="180" height="${h}" rx="9"/><text class="po-ext-title" x="${x + 90}" y="${y + 19}" text-anchor="middle">${esc(def.title)}</text>`;
          const ppos = {};
          def.pins.forEach((pp, k) => {
            const py = y + 34 + k * ph + 4;
            const px = side === "left" ? x + 180 : x;
            ppos[pp] = [px, py];
            partSvg += `<circle class="po-ext-pin" cx="${px}" cy="${py}" r="4"/><text class="po-ext-lbl" x="${side === "left" ? px - 10 : px + 10}" y="${py + 4}" text-anchor="${side === "left" ? "end" : "start"}">${esc(pp)}</text>`;
          });
          partSvg += `</g>`;
          g.wires.forEach((w) => {
            const t = ppos[w.ppin];
            if (!t) throw new Error(`Pinout wiring: ${g.part} has no pin ${w.ppin}`);
            const lane = laneUse[side]++;
            const out = side === "left" ? G.BX - 116 - lane * 9 : G.BX + G.BW + 116 + lane * 9;
            const p = w.p;
            let d;
            if (p.swd) d = `M${p.x},${p.y} V${p.y + 34 + lane * 7} H${out} V${t[1]} H${t[0]}`;
            else d = `M${p.x},${p.y} H${out} V${t[1]} H${t[0]}`;
            wireSvg += `<path class="po-wire k-${w.kind || "signal"}" d="${d}"/>`;
          });
          height = Math.max(height, y + h + 20);
        });
      });
    }
    height = Math.max(height, G.TOP + data.headers.left.length * G.PITCH + 90);
    s += wireSvg + pinSvg + partSvg;
    const title = opts.title || `${data.board.name} pinout`;
    const style = opts.standalone ? `<style>${STANDALONE_CSS}</style>` : "";
    const svg = `<svg class="po-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.W} ${height}" role="${opts.standalone ? "img" : "group"}" aria-label="${esc(title)}">${style}<title>${esc(title)}</title>${s}</svg>`;
    return { svg, height };
  }

  // Fixed light palette for exported wiring.svg files (no site CSS available there).
  const STANDALONE_CSS = `text{font-family:Inter,Segoe UI,Arial,sans-serif}.po-board{fill:#1e5631;stroke:#123820}.po-usb{fill:#9aa3ad;stroke:#6b7480}
.po-chip{fill:#222;stroke:#444}.po-chip-lbl{fill:#eee;font:700 12px monospace}.po-chip-sub{fill:#bbb;font:10px monospace}
.po-xtal{fill:#c9ced6}.po-jumper rect{fill:#111}.po-jumper circle{fill:#d4af37}.po-led rect{fill:#f87171}
.po-part-lbl{fill:#e5efe8;font:10px monospace}.po-usb-lbl{fill:#334155;font:10px monospace}.po-name.po-swd{fill:#e5efe8}.po-dot{fill:#d4af37;stroke:#7a5c00}.po-tag{fill:#fff;stroke:#94a3b8}
.po-name{fill:#0f172a;font:700 11px monospace}.po-fn{fill:#475569;font:10px monospace}.po-pin.hl .po-tag{fill:#fde7d3;stroke:#a85a1c}
.po-ext rect{fill:#f8fafc;stroke:#64748b}.po-ext-title{fill:#0f172a;font:700 12px sans-serif}.po-ext-pin{fill:#64748b}
.po-ext-lbl{fill:#334155;font:10px monospace}.po-wire{fill:none;stroke-width:2.2;stroke:#2563eb}.po-wire.k-power{stroke:#dc2626}
.po-wire.k-ground{stroke:#111827}.po-wire.k-swd{stroke:#7c3aed}`;

  /* ------------------------------------------------------------ browser */
  function mount(host, opts = {}) {
    const S = window.MCU_STRINGS.pinout;
    const data = window.MCU_DATA[opts.board || "bluepill"];
    if (!data) throw new Error(`Pinout: no board data "${opts.board}"`);
    let state = { mode: opts.mode || "functions", query: "", selected: (opts.highlight || [])[0] || null };
    const modes = opts.wiring ? ["functions", "electrical", "wiring"] : ["functions", "electrical"];
    host.classList.add("po-host");
    host.innerHTML = `<div class="po-toolbar">
        <div class="po-modes" role="group" aria-label="${S.modeLabel}">${modes.map((m) => `<button type="button" class="btn sm" data-mode="${m}">${S.modes[m]}</button>`).join("")}</div>
        <input type="search" class="po-search" placeholder="${S.search}" aria-label="${S.search}">
      </div>
      <div class="po-body"><div class="po-canvas"></div><div class="po-panel glass" aria-live="polite"></div></div>
      <div class="po-legend"></div>`;
    const canvas = host.querySelector(".po-canvas"), panel = host.querySelector(".po-panel"), legend = host.querySelector(".po-legend");
    const draw = () => {
      canvas.innerHTML = render(data, { ...opts, ...state }).svg;
      host.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
      legend.innerHTML = (state.mode === "electrical" ? ["ft", "nft", "power", "ground"] : ["hl", "match"]).map((k) => `<span class="po-lg-${k}"><i></i>${S.legend[k]}</span>`).join("");
      showPanel();
    };
    const showPanel = () => {
      const k = state.selected;
      const info = k && data.pins[k];
      const pw = k && data.power[k];
      if (!k || (!info && !pw)) { panel.innerHTML = `<p class="muted small">${S.hint}</p>`; return; }
      if (pw) { panel.innerHTML = `<h3 class="w-title">${k}</h3><p>${pw.notes || ""}</p>`; return; }
      const chip = (t) => `<code>${t}</code>`;
      panel.innerHTML = `<h3 class="w-title">${k} <span class="badge ${info.ft ? "green" : "amber"}">${info.ft ? S.ft : S.nft}</span></h3>
        <p class="small muted">${S.lqfp(info.lqfp)}</p>
        <p><b>${S.af}</b><br>${info.af.map(chip).join(" ")}</p>
        ${info.remap.length ? `<p><b>${S.remap}</b><br>${info.remap.map(chip).join(" ")}</p>` : ""}
        ${info.notes ? `<p class="small">${info.notes}</p>` : ""}
        ${info.warn ? `<p class="po-warn small">⚠ ${info.warn}</p>` : ""}
        ${info.examples ? `<p class="small muted">${S.usedBy(info.examples.join(", "))}</p>` : ""}
        <p class="small muted">${S.source(data.board.source)}</p>`;
    };
    host.addEventListener("click", (e) => {
      const m = e.target.closest("[data-mode]");
      if (m) { state.mode = m.dataset.mode; draw(); return; }
      const p = e.target.closest("[data-pin]");
      if (p) { state.selected = p.dataset.pin; draw(); const el = canvas.querySelector(`[data-pin="${p.dataset.pin}"]`); if (el) el.focus(); }
    });
    host.addEventListener("keydown", (e) => {
      const p = e.target.closest && e.target.closest("[data-pin]");
      if (p && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); p.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
    });
    host.querySelector(".po-search").addEventListener("input", (e) => { state.query = e.target.value; draw(); });
    draw();
    return {
      select(k) { state.selected = k; draw(); },
      setMode(m) { state.mode = m; draw(); },
      exportSVG() { return render(data, { ...opts, ...state, standalone: true }).svg; },
    };
  }

  return { render, mount, layoutPins };
});
