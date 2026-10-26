/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — pinout engine (PLAN.md §9.2).
   MCU.Pinout(host, { board: "nucleo", mode, highlight, wiring, labels })
     mode: "functions" | "electrical" (analog inputs) | "wiring"
     highlight: ["PA9", "PA10"]           pins used on this page
     labels: { PA9: "USART1_TX" }         function shown next to a pin
     wiring: [{ pin: "D8", to: "oled.SCL", kind: "signal"|"power"|"ground" }]
       pin: Arduino label ("D8", "A1"), a Morpho pin name ("PA11"), a power label ("3V3"),
       or "left:GND" / "right:GND" when the label exists more than once.
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
  const G = { W: 980, BX: 370, BW: 240, TOP: 196, PITCH: 25, LABEL_GAP: 14, MP: 40 };

  /** Header label ("D8", "A1", "PA11", "5V") → pin key in data.pins ("PA9") or data.power ("5V"). */
  function keyOf(data, label) {
    if (data.arduino[label]) return data.arduino[label];
    return label;
  }
  function category(data, key) {
    const p = data.pins[key];
    if (p) return p.analog.some((s) => s.startsWith("ADC")) ? "adc" : "dig";
    const pw = data.power[key];
    return pw ? pw.kind : "power";
  }
  /** One function to print next to a pin: the first real alternate function. */
  function headline(info) {
    const af = info.af.find(([n, sig]) => n > 0 && sig !== "EVENTOUT");
    return af ? af[1] : info.analog[0] || "";
  }

  /** Geometry of every header pin: [{label, key, side, x, y}] */
  function layoutPins(data) {
    const out = [];
    const H = data.headers;
    H.left.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "left", x: G.BX + 18, y: G.TOP + i * G.PITCH }));
    H.right.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "right", x: G.BX + G.BW - 18, y: G.TOP + i * G.PITCH }));
    const rows = Math.max(H.left.length, H.right.length);
    const my = G.TOP + rows * G.PITCH + 76;
    const mx0 = G.BX + G.BW / 2 - ((H.morpho.length - 1) * G.MP) / 2;
    H.morpho.forEach((l, i) => out.push({ label: l, key: keyOf(data, l), side: "morpho", swd: true, x: mx0 + i * G.MP, y: my }));
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
    const rows = Math.max(data.headers.left.length, data.headers.right.length);
    const boardY = 40;
    const boardH = G.TOP + rows * G.PITCH - boardY;
    const cx = G.BX + G.BW / 2;
    let s = "";

    // board outline, ST-LINK part with its USB connector, chip, buttons, LED, crystal
    s += `<rect class="po-board" x="${G.BX}" y="${boardY}" width="${G.BW}" height="${boardH}" rx="10"/>`;
    s += `<rect class="po-usb" x="${cx - 26}" y="${boardY - 16}" width="52" height="26" rx="4"/><text class="po-usb-lbl" x="${cx}" y="${boardY - 22}" text-anchor="middle">USB (ST-LINK)</text>`;
    s += `<rect class="po-stlink" x="${G.BX + 14}" y="${boardY + 18}" width="${G.BW - 28}" height="96" rx="6"/>`;
    s += `<text class="po-part-lbl" x="${cx}" y="${boardY + 46}" text-anchor="middle">ST-LINK/V3E</text><text class="po-part-lbl" x="${cx}" y="${boardY + 62}" text-anchor="middle">SWD + virtual COM port</text>`;
    s += `<text class="po-part-lbl" x="${cx}" y="${boardY + 78}" text-anchor="middle">(LPUART1 on PA2/PA3)</text>`;
    const chipY = G.TOP + 6.5 * G.PITCH;
    s += `<g transform="rotate(45 ${cx} ${chipY})"><rect class="po-chip" x="${cx - 44}" y="${chipY - 44}" width="88" height="88" rx="4"/></g>`;
    s += `<text class="po-chip-lbl" x="${cx}" y="${chipY - 2}" text-anchor="middle">STM32G474</text><text class="po-chip-sub" x="${cx}" y="${chipY + 12}" text-anchor="middle">RET6 · LQFP64</text>`;
    s += `<rect class="po-xtal" x="${cx - 18}" y="${G.TOP + 1.6 * G.PITCH}" width="36" height="14" rx="7"/><text class="po-part-lbl" x="${cx}" y="${G.TOP + 1.6 * G.PITCH - 5}" text-anchor="middle">24 MHz (X3)</text>`;
    const by = G.TOP + 12 * G.PITCH;
    s += `<circle class="po-btn b1" cx="${cx - 34}" cy="${by}" r="10"/><text class="po-part-lbl" x="${cx - 34}" y="${by + 24}" text-anchor="middle">B1 USER</text>`;
    s += `<circle class="po-btn b2" cx="${cx + 34}" cy="${by}" r="10"/><text class="po-part-lbl" x="${cx + 34}" y="${by + 24}" text-anchor="middle">B2 RESET</text>`;
    const ly = G.TOP + 14.6 * G.PITCH;
    s += `<g class="po-led"><rect x="${cx - 8}" y="${ly}" width="16" height="9" rx="2"/></g><text class="po-part-lbl" x="${cx}" y="${ly + 22}" text-anchor="middle">LD2 = PA5 (active-high)</text>`;
    const mFirst = pins.find((p) => p.side === "morpho");
    if (mFirst) {
      const mw = (data.headers.morpho.length - 1) * G.MP + 56;
      s += `<rect class="po-morpho" x="${cx - mw / 2}" y="${mFirst.y - 52}" width="${mw}" height="68" rx="8"/>`;
      s += `<text class="po-part-lbl" x="${cx}" y="${mFirst.y - 36}" text-anchor="middle">Morpho headers CN7/CN10: pins this course uses (positions not drawn)</text>`;
    }

    // pins (collected separately so wires can be drawn underneath them)
    let pinSvg = "", wireSvg = "", partSvg = "";
    pins.forEach((p) => {
      const info = data.pins[p.key];
      const cat = category(data, p.key);
      const fn = (opts.labels && opts.labels[p.key]) || "";
      const text = [p.key, p.label, ...(info ? [...info.af.map((a) => a[1]), ...info.analog, ...info.other] : [])].join(" ").toLowerCase();
      const match = q && text.includes(q);
      const cls = ["po-pin", "c-" + cat, hl.has(p.key) ? "hl" : "", match ? "match" : "", opts.selected === p.key ? "sel" : "", info && info.warn ? "warn" : ""].filter(Boolean).join(" ");
      const name = info ? (p.label !== p.key ? `${p.label} ${p.key}` : p.key) : p.label;
      const tip = info ? `${p.key} — ${info.af.map((a) => a[1]).slice(0, 6).join(", ")}` : `${p.label} — ${(data.power[p.key] || {}).notes || ""}`;
      pinSvg += `<g class="${cls}" data-pin="${esc(p.key)}" tabindex="0" role="button" aria-label="${esc(name + (fn ? ", " + fn : ""))}" data-tip="${esc(tip)}">`;
      pinSvg += `<circle class="po-dot" cx="${p.x}" cy="${p.y}" r="6.5"/>`;
      if (p.side === "morpho") {
        pinSvg += `<text class="po-name po-swd" x="${p.x}" y="${p.y - 13}" text-anchor="middle">${esc(p.label)}</text>`;
      } else {
        const left = p.side === "left";
        const nx = left ? G.BX - G.LABEL_GAP : G.BX + G.BW + G.LABEL_GAP;
        const w = name.length * 7.6 + 14;
        const rx = left ? nx - w : nx;
        pinSvg += `<rect class="po-tag" x="${rx}" y="${p.y - 10}" width="${w}" height="20" rx="5"/>`;
        pinSvg += `<text class="po-name" x="${rx + w / 2}" y="${p.y + 4}" text-anchor="middle">${esc(name)}</text>`;
        const fx = left ? rx - 8 : rx + w + 8;
        const elec = info ? (cat === "adc" ? info.analog.find((x) => x.startsWith("ADC")) : "digital only") : ({ power: "power", ground: "ground", control: "" }[cat]);
        const ftxt = fn || (mode === "electrical" ? elec : info ? headline(info) : "");
        if (ftxt && mode !== "wiring") pinSvg += `<text class="po-fn" x="${fx}" y="${p.y + 4}" text-anchor="${left ? "end" : "start"}">${esc(ftxt)}</text>`;
      }
      pinSvg += `</g>`;
    });

    // wiring: parts on the side of their first connection, wires routed in lanes
    let height = (mFirst ? mFirst.y + 36 : boardY + boardH + 60);
    if (mode === "wiring" && opts.wiring && opts.wiring.length) {
      const byPart = {};
      opts.wiring.forEach((w, i) => {
        const dot = w.to.indexOf("."), part = w.to.slice(0, dot), ppin = w.to.slice(dot + 1);
        // "left:GND", "right:GND" pick one of several header pins with the same name
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
        let next = 40;
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
            if (p.swd) d = `M${p.x},${p.y} V${p.y + 26 + lane * 7} H${out} V${t[1]} H${t[0]}`;
            else if (p.side !== side) {
              // pin on the other side of the board: out on its own side, under the board, then across
              const own = p.side === "left" ? G.BX - 122 - lane * 4 : G.BX + G.BW + 122 + lane * 4;
              const under = (mFirst ? mFirst.y + 40 : boardY + boardH + 20) + lane * 7;
              d = `M${p.x},${p.y} H${own} V${under} H${out} V${t[1]} H${t[0]}`;
              height = Math.max(height, under + 14);
            } else d = `M${p.x},${p.y} H${out} V${t[1]} H${t[0]}`;
            wireSvg += `<path class="po-wire k-${w.kind || "signal"}" d="${d}"/>`;
            height = Math.max(height, p.y + 40 + lane * 7);
          });
          height = Math.max(height, y + h + 20);
        });
      });
    }
    s += wireSvg + pinSvg + partSvg;
    const title = opts.title || `${data.board.name} pinout`;
    const style = opts.standalone ? `<style>${STANDALONE_CSS}</style>` : "";
    const svg = `<svg class="po-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.W} ${height}" role="${opts.standalone ? "img" : "group"}" aria-label="${esc(title)}">${style}<title>${esc(title)}</title>${s}</svg>`;
    return { svg, height };
  }

  // Fixed light palette for exported wiring.svg files (no site CSS available there).
  const STANDALONE_CSS = `text{font-family:Inter,Segoe UI,Arial,sans-serif}.po-board{fill:#f4f6f8;stroke:#94a3b8}.po-usb{fill:#9aa3ad;stroke:#6b7480}
.po-stlink,.po-morpho{fill:#e2e8f0;stroke:#94a3b8}.po-btn.b1{fill:#2563eb}.po-btn.b2{fill:#111827}
.po-chip{fill:#222;stroke:#444}.po-chip-lbl{fill:#eee;font:700 12px monospace}.po-chip-sub{fill:#bbb;font:10px monospace}
.po-xtal{fill:#c9ced6}.po-led rect{fill:#22c55e}
.po-part-lbl{fill:#334155;font:10px monospace}.po-usb-lbl{fill:#334155;font:10px monospace}.po-name.po-swd{fill:#0f172a}.po-dot{fill:#d4af37;stroke:#7a5c00}.po-tag{fill:#fff;stroke:#94a3b8}
.po-name{fill:#0f172a;font:700 11px monospace}.po-fn{fill:#475569;font:10px monospace}.po-pin.hl .po-tag{fill:#fde7d3;stroke:#a85a1c}
.po-ext rect{fill:#f8fafc;stroke:#64748b}.po-ext-title{fill:#0f172a;font:700 12px sans-serif}.po-ext-pin{fill:#64748b}
.po-ext-lbl{fill:#334155;font:10px monospace}.po-wire{fill:none;stroke-width:2.2;stroke:#2563eb}.po-wire.k-power{stroke:#dc2626}
.po-wire.k-ground{stroke:#111827}.po-wire.k-swd{stroke:#7c3aed}`;

  /* ------------------------------------------------------------ browser */
  function mount(host, opts = {}) {
    const S = window.MCU_STRINGS.pinout;
    const data = window.MCU_DATA[opts.board || "nucleo"];
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
      legend.innerHTML = (state.mode === "electrical" ? ["adc", "dig", "power", "ground"] : ["hl", "match"]).map((k) => `<span class="po-lg-${k}"><i></i>${S.legend[k]}</span>`).join("");
      showPanel();
    };
    const showPanel = () => {
      const k = state.selected;
      const info = k && data.pins[k];
      const pw = k && data.power[k];
      if (!k || (!info && !pw)) { panel.innerHTML = `<p class="muted small">${S.hint}</p>`; return; }
      if (pw) { panel.innerHTML = `<h3 class="w-title">${k}</h3><p>${pw.notes || ""}</p>`; return; }
      const chip = (t) => `<code>${t}</code>`;
      const adc = info.analog.some((x) => x.startsWith("ADC"));
      panel.innerHTML = `<h3 class="w-title">${k}${info.arduino ? ` <span class="badge blue">${info.arduino}</span>` : ""} <span class="badge ${adc ? "green" : "amber"}">${adc ? S.adc : S.dig}</span></h3>
        <p class="small muted">${S.lqfp(info.lqfp64, info.lqfp100)}</p>
        <p><b>${S.af}</b><br>${info.af.map(([n, sig]) => chip(`AF${n} ${sig}`)).join(" ")}</p>
        ${info.analog.length ? `<p><b>${S.analog}</b><br>${info.analog.map(chip).join(" ")}</p>` : ""}
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
