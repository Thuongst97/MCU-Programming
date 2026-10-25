/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — diagram engine: glass nodes, glowing flow lines with signal
   pulses, hover/focus states, automatic tooltips for technical terms, and the
   layered architecture renderer (used for the bus matrix and the AUTOSAR stack).
   Ported from aaos14-academy; the Treble band became a generic "boundary" band.
   ========================================================================= */
(function () {
  "use strict";
  const { esc } = window.MCU;
  const S = window.MCU_STRINGS;
  const CHAR_W = 6.1; // ≈ width of a 10px mono glyph
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;

  /* ---------------------------------------------------- Term tooltips
     Short explanations shown on diagram nodes. Longer definitions live in glossary-data.js,
     which termTip() falls back to. */
  const TERMS = {
    "MCU": "Microcontroller — CPU, flash, SRAM and peripherals on one chip",
    "Cortex-M3": "Arm's ARMv7-M core used in the STM32F103 (Thumb-2, NVIC, SysTick)",
    "NVIC": "Nested Vectored Interrupt Controller — prioritises and dispatches interrupts",
    "SysTick": "24-bit down-counter in the Cortex-M core, the usual 1 ms time base",
    "EXTI": "External interrupt/event controller — turns pin edges into interrupts",
    "AFIO": "Alternate-function I/O — pin remapping and EXTI line selection on STM32F1",
    "RCC": "Reset and clock control — clock sources, PLL, prescalers and peripheral clock enables",
    "PLL": "Phase-locked loop — multiplies the 8 MHz HSE up to 72 MHz",
    "HSE": "High-speed external oscillator — the 8 MHz crystal on the Blue Pill",
    "HSI": "High-speed internal RC oscillator — 8 MHz, the clock after reset",
    "AHB": "Advanced High-performance Bus — connects core, DMA, flash and SRAM",
    "APB1": "Low-speed peripheral bus, 36 MHz max on the STM32F103",
    "APB2": "High-speed peripheral bus, 72 MHz max (GPIO, USART1, ADC, TIM1)",
    "DMA": "Direct memory access — moves data between peripherals and memory without the CPU",
    "GPIO": "General-purpose I/O pin, configured through GPIOx_CRL/CRH on STM32F1",
    "USART": "Universal synchronous/asynchronous receiver-transmitter (serial port)",
    "SPI": "Serial Peripheral Interface — 4-wire, full-duplex, one chip select per device",
    "I2C": "Inter-Integrated Circuit — 2-wire bus with addresses and ACK bits",
    "ADC": "Analog-to-digital converter — 12-bit SAR on the STM32F103",
    "bxCAN": "ST's basic extended CAN controller in the STM32F103",
    "CAN": "Controller Area Network — robust differential broadcast bus between ECUs",
    "CAN FD": "CAN with flexible data-rate — up to 64-byte frames (not supported by bxCAN)",
    "LIN": "Local Interconnect Network — low-cost single-wire bus with one master",
    "IWDG": "Independent watchdog — clocked by LSI, resets the MCU if not refreshed",
    "SWD": "Serial Wire Debug — 2-wire debug port (SWDIO on PA13, SWCLK on PA14)",
    "ST-Link": "ST's USB debug probe; speaks SWD to the target",
    "OpenOCD": "Open On-Chip Debugger — talks to the ST-Link and serves GDB",
    "Renode": "Antmicro's open-source simulator that runs the same ELF without hardware",
    "ECU": "Electronic Control Unit — one per vehicle function (body, engine, brakes…)",
    "SWC": "AUTOSAR software component — application logic with ports and runnables",
    "RTE": "Runtime Environment — the generated layer that connects SWCs to each other and to BSW",
    "BSW": "Basic Software — AUTOSAR's standardised services, ECU abstraction and MCAL",
    "MCAL": "Microcontroller Abstraction Layer — AUTOSAR drivers that touch the registers",
    "IoHwAb": "I/O Hardware Abstraction — maps ECU signals to MCAL channels",
    "Com": "AUTOSAR COM — packs signals into I-PDUs and back",
    "PduR": "PDU Router — routes I-PDUs between Com, diagnostics and the bus interfaces",
    "CanIf": "CAN Interface — hardware-independent access to CAN drivers",
    "Dem": "Diagnostic Event Manager — debounces events and stores DTCs",
    "Dcm": "Diagnostic Communication Manager — answers UDS requests",
    "NvM": "NVRAM Manager — stores data blocks in non-volatile memory",
    "EcuM": "ECU State Manager — start-up and shut-down sequence",
    "Det": "Default Error Tracer — collects development errors",
    "Os": "AUTOSAR OS — OSEK-based static RTOS with tasks, alarms and events",
    "FreeRTOS": "Open-source real-time kernel (MIT) used from module 14 on",
    "AUTOSAR": "Standardised automotive software architecture (Classic Platform for MCUs)",
  };
  const TERM_RES = Object.keys(TERMS).sort((a, b) => b.length - a.length).map((k) => [k, new RegExp("(^|[^A-Za-z0-9_])" + k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "($|[^A-Za-z0-9_])")]);
  function termTip(label) {
    if (!label) return "";
    for (const [k, re] of TERM_RES) if (re.test(label)) return `${k}${S.tooltipSep}${TERMS[k]}`;
    const g = (window.GLOSSARY || []).find((x) => x.term.toLowerCase() === String(label).toLowerCase());
    return g ? `${g.term}${S.tooltipSep}${g.full}` : "";
  }
  const tipAttr = (t) => (t ? ` data-tip="${esc(t)}" tabindex="0"` : "");

  /* ---------------------------------------------------- Primitives */
  const D = {
    termTip,
    reducedMotion: REDUCED,

    /** Glass node. opts: {c, soft, title, sub, tip, titleY, center, container} */
    box(x, y, w, h, o = {}) {
      const tip = o.tip !== undefined ? o.tip : termTip(o.title);
      const container = o.container !== undefined ? o.container : w * h > 46000;
      const c = o.c || "#8a8f98";
      const tx = o.center ? x + w / 2 : x + 12;
      const anchor = o.center ? ' text-anchor="middle"' : "";
      const ty = y + (o.titleY || 19);
      let s = `<g class="hd-node${container ? " is-container" : ""}${o.soft ? " soft" : ""}" style="--c:${c}"${tipAttr(tip)}>`;
      s += `<rect class="hd-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>`;
      if (!o.soft) s += `<rect class="hd-accent" x="${o.center ? x + w / 2 - Math.min(18, w / 4) : x + 12}" y="${y - 0.5}" width="${Math.min(36, w / 2)}" height="2.5" rx="1.25"/>`;
      if (o.title) s += `<text class="hd-title" x="${tx}" y="${ty}"${anchor}>${esc(o.title)}</text>`;
      if (o.sub) s += `<text class="hd-sub" x="${tx}" y="${ty + 14}"${anchor}>${esc(o.sub)}</text>`;
      return s + `</g>`;
    },
    /** Wrapping row of chips inside [x, x+maxW]. Returns {svg, bottom} */
    chips(x, y, maxW, labels, h = 20, gap = 6) {
      let cx = x, cy = y, svg = "";
      labels.forEach((l) => {
        const w = Math.ceil(l.length * CHAR_W + 14);
        if (cx + w > x + maxW && cx > x) { cx = x; cy += h + gap; }
        svg += `<g class="hd-chip"${tipAttr(termTip(l))}><rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="5"/><text x="${cx + 7}" y="${cy + 14}">${esc(l)}</text></g>`;
        cx += w + gap;
      });
      return { svg, bottom: cy + h };
    },
    /** Equal-width row of boxes. items: [{title, sub, c, tip}] */
    row(x, y, w, h, items, gap = 10, extra = {}) {
      const bw = (w - gap * (items.length - 1)) / items.length;
      return items.map((it, i) => D.box(x + i * (bw + gap), y, bw, h, { center: true, titleY: h / 2 - (it.sub ? 2 : -4), ...extra, ...it })).join("");
    },
    label(x, y, text, anchor = "start") { return `<text class="hd-label" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`; },
    note(x, y, text, anchor = "start") { return `<text class="hd-note" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`; },
    /** Label with a solid pill behind it so it stays legible over lines. lines: string | string[] */
    pill(x, y, lines, anchor = "middle", cls = "", tip = "") {
      const arr = Array.isArray(lines) ? lines : [lines];
      const w = Math.max(...arr.map((l) => l.length)) * 6.35 + 14, h = arr.length * 13 + 6;
      const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
      const tx = anchor === "middle" ? x : anchor === "end" ? x - 7 : x + 7;
      return `<g class="hd-pill ${cls}"${tipAttr(tip)}><rect x="${left}" y="${y - 11}" width="${w}" height="${h}" rx="6"/>` +
        arr.map((l, i) => `<text x="${tx}" y="${y + i * 13}" text-anchor="${anchor}">${esc(l)}</text>`).join("") + `</g>`;
    },
    /** Flow line with arrowhead; irq/bus lines (or opts.pulse) carry an animated signal pulse. */
    arrow(d, cls = "", id = "hd", opts = {}) {
      const pid = `${id}-a${++uid}`;
      let s = `<path id="${pid}" class="hd-arrow ${cls}" d="${d}" marker-end="url(#${id}-ah${cls ? "-" + cls : ""})"/>`;
      const pulse = opts.pulse !== undefined ? opts.pulse : cls === "irq" || cls === "bus";
      if (pulse && !REDUCED) {
        s += `<circle class="hd-pulse ${cls}" r="2.8"><animateMotion dur="${opts.dur || 2.6}s" begin="${((uid * 0.37) % 2.6).toFixed(2)}s" repeatCount="indefinite"><mpath href="#${pid}"/></animateMotion></circle>`;
      }
      return s;
    },
    pin(x, y, n) { return `<g class="hd-pin"><circle cx="${x}" cy="${y}" r="10"/><text x="${x}" y="${y + 3.5}" text-anchor="middle">${n}</text></g>`; },
    defs(id = "hd") {
      const m = (suffix, cls) => `<marker id="${id}-ah${suffix}" class="hd-mk ${cls}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker>`;
      return `<defs>${m("", "")}${m("-irq", "irq")}${m("-bus", "bus")}${m("-dma", "dma")}${m("-hl", "hl")}</defs>`;
    },
    svg(w, h, body, label) { return `<svg class="hd-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`; },
    /** Attach a moving pulse to an existing path/line element (used by interactive diagrams). */
    attachPulse(el, cls = "", dur = 1.4) {
      if (REDUCED || !el) return null;
      const NS = "http://www.w3.org/2000/svg";
      let d = el.getAttribute("d");
      if (!d && el.tagName === "line") d = `M${el.getAttribute("x1")},${el.getAttribute("y1")} L${el.getAttribute("x2")},${el.getAttribute("y2")}`;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "hd-pulse live " + cls);
      c.setAttribute("r", "3.4");
      const a = document.createElementNS(NS, "animateMotion");
      a.setAttribute("dur", dur + "s");
      a.setAttribute("repeatCount", "indefinite");
      a.setAttribute("path", d);
      c.appendChild(a);
      el.parentNode.appendChild(c);
      return c;
    },
  };

  /* ---------------------------------------------------- Layered architecture renderer
     spec = {
       id, label, nodeH?,
       bands: [{ key, tag:"L1", title:["Application", "SWCs"], sub:["hand-written"], boundary?:true, tone?, marker?:"RTE" }],
       nodes: [{ id, band, row?, rows?, at?:[x0,x1] (fractions of the lane), span?, title, sub?, tag?:"SWC", tip?, hl?, soft?, tone? }],
       edges: [{ from, to, kind:"call"|"rte"|"pdu"|"hw"|"opt", label?, side?:"right"|"left", marker?:"RTE" }],
       toneLabels?: { hw: "Core", … }   legend names when the diagram is not an AUTOSAR stack
     }
     A band with boundary:true is drawn as a glowing line (e.g. the RTE between SWCs and BSW);
     edges that cross it get a small marker chip. */
  const LG = { X0: 186, X1: 958, PAD: 16, ROW_GAP: 10, BAND_GAP: 10, BOUNDARY_H: 46 };
  const TAG_TONE = {
    SWC: "asw", App: "asw", RTE: "rte", Svc: "svc", Service: "svc", ECUAL: "ecual", IoHwAb: "ecual",
    MCAL: "mcal", Driver: "mcal", CDD: "cdd", HW: "hw", MCU: "hw", Bus: "hw", ECU: "hw", Tool: "tool", Host: "tool",
  };
  /** Wrap text into ≤ maxLines lines of ≤ maxChars, breaking after spaces, "_" or at camelCase humps. */
  function wrap(str, maxChars, maxLines) {
    const lines = [];
    let rest = str.trim();
    while (rest && lines.length < maxLines) {
      if (rest.length <= maxChars) { lines.push(rest); rest = ""; break; }
      if (lines.length === maxLines - 1) { lines.push(rest.slice(0, maxChars - 1).trimEnd() + "…"); rest = ""; break; }
      let cut = -1;
      for (let i = Math.min(maxChars, rest.length - 1); i > maxChars * 0.35; i--) {
        const a = rest[i - 1], b = rest[i];
        if (a === " " || a === "_" || (/[a-z0-9]/.test(a) && /[A-Z]/.test(b))) { cut = i; break; }
      }
      if (cut < 0) cut = maxChars;
      lines.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).replace(/^[\s·]+/, "");
    }
    return lines;
  }

  D.layered = function (host, spec) {
    const id = spec.id || "lg" + (++uid);
    const NODE_H = spec.nodeH || 60;
    const CW = LG.X1 - LG.X0;
    const bands = {}, nodes = {};
    let y = 8;
    spec.bands.forEach((b) => {
      const mine = spec.nodes.filter((n) => n.band === b.key);
      const boundary = b.boundary && mine.length === 0;   // a boundary that holds nodes needs a full band
      const rows = boundary ? 0 : Math.max(1, ...mine.map((n) => (n.row || 0) + (n.rows || 1)));
      const labelH = 52 + [].concat(b.title || []).length * 14 + [].concat(b.sub || []).length * 12;
      const h = boundary ? LG.BOUNDARY_H : Math.max(b.minH || 0, labelH, LG.PAD * 2 + rows * NODE_H + (rows - 1) * LG.ROW_GAP);
      bands[b.key] = { ...b, boundary, y, h, rows, tone: b.tone || TAG_TONE[b.tag] || "asw" };
      y += h + LG.BAND_GAP;
    });
    const H = y - LG.BAND_GAP + 8;

    // node geometry
    spec.bands.forEach((b) => {
      const B = bands[b.key];
      const byRow = {};
      spec.nodes.filter((n) => n.band === b.key).forEach((n) => (byRow[n.row || 0] = byRow[n.row || 0] || []).push(n));
      Object.entries(byRow).forEach(([r, list]) => {
        if (list.some((n) => !n.at)) {
          const total = list.reduce((a, n) => a + (n.span || 1), 0);
          const unit = (CW - 12 * (list.length - 1)) / total;
          let cx = LG.X0;
          list.forEach((n) => { n._x = cx; n._w = unit * (n.span || 1); cx += n._w + 12; });
        } else list.forEach((n) => { n._x = LG.X0 + n.at[0] * CW; n._w = (n.at[1] - n.at[0]) * CW; });
        list.forEach((n) => {
          const rr = n.rows || 1;
          n._y = B.y + LG.PAD + +r * (NODE_H + LG.ROW_GAP);
          n._h = NODE_H * rr + LG.ROW_GAP * (rr - 1);
          n._tone = n.tone || TAG_TONE[n.tag] || B.tone;
          nodes[n.id] = n;
        });
      });
    });

    // edge endpoints (attachment points spread along each side)
    const ends = [];
    const edges = (spec.edges || []).filter((e) => nodes[e.from] && nodes[e.to]).map((e, i) => {
      const a = nodes[e.from], b = nodes[e.to];
      const aB = a._y + a._h, bB = b._y + b._h;
      let sa, sb;
      if (e.side) { sa = e.side; sb = e.side; }
      else if (b._y >= aB - 1) { sa = "bottom"; sb = "top"; }
      else if (bB <= a._y + 1) { sa = "top"; sb = "bottom"; }
      else if (b._x >= a._x) { sa = "right"; sb = "left"; }
      else { sa = "left"; sb = "right"; }
      const E = { ...e, i, a, b, sa, sb };
      ends.push({ E, node: a, side: sa, other: b, which: "s" }, { E, node: b, side: sb, other: a, which: "t" });
      return E;
    });
    const groups = {};
    ends.forEach((p) => (groups[p.node.id + ":" + p.side] = groups[p.node.id + ":" + p.side] || []).push(p));
    Object.values(groups).forEach((list) => {
      const vert = list[0].side === "top" || list[0].side === "bottom";
      list.sort((p, q) => (vert ? p.other._x + p.other._w / 2 - (q.other._x + q.other._w / 2) : p.other._y - q.other._y));
      list.forEach((p, k) => {
        const n = p.node, f = (k + 1) / (list.length + 1);
        p.E[p.which] = p.side === "top" ? [n._x + n._w * f, n._y] : p.side === "bottom" ? [n._x + n._w * f, n._y + n._h]
          : p.side === "left" ? [n._x, n._y + n._h * f] : [n._x + n._w, n._y + n._h * f];
      });
    });
    edges.forEach((E) => {
      const [sx, sy] = E.s, [ex, ey] = E.t;
      if (E.side) {
        const xr = E.side === "right" ? Math.max(E.a._x + E.a._w, E.b._x + E.b._w) + 16 : Math.min(E.a._x, E.b._x) - 16;
        E.d = `M${sx},${sy} H${xr} V${ey} H${ex}`;
      } else if (E.sa === "bottom" || E.sa === "top") {
        const my = (sy + ey) / 2;
        E.d = `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`;
        E.cubic = [[sx, sy], [sx, my], [ex, my], [ex, ey]];
      } else {
        const mx = (sx + ex) / 2;
        E.d = `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`;
      }
    });

    // ---- draw
    const KINDS = ["call", "rte", "pdu", "hw", "opt"];
    let s = `<defs>
      <linearGradient id="${id}-bnd" gradientUnits="userSpaceOnUse" x1="${LG.X0 - 10}" y1="0" x2="${LG.X1 + 20}" y2="0">
        <stop offset="0" class="lg-t0"/><stop offset="0.12" class="lg-t1"/>
        <stop offset="0.5" class="lg-t2"/><stop offset="0.88" class="lg-t1"/><stop offset="1" class="lg-t0"/></linearGradient>
      ${KINDS.map((k) => `<marker id="${id}-m-${k}" class="lg-mk ${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z"/></marker>`).join("")}
    </defs>`;
    spec.bands.forEach((b) => {
      const B = bands[b.key];
      const titles = [].concat(b.title || []), subs = [].concat(b.sub || []);
      if (B.boundary) {
        const ty = B.y + B.h / 2;
        s += `<g class="lg-boundary tn-${B.tone}"${b.tip ? ` data-tip="${esc(b.tip)}"` : ""}>
          <line class="lg-bnd-glow" x1="${LG.X0 - 10}" y1="${ty}" x2="${LG.X1 + 20}" y2="${ty}" stroke="url(#${id}-bnd)"/>
          <line class="lg-bnd-core" x1="${LG.X0 - 10}" y1="${ty}" x2="${LG.X1 + 20}" y2="${ty}" stroke="url(#${id}-bnd)"/>
          <g class="lg-badge"><rect x="24" y="${ty - 18}" width="34" height="17" rx="5"/><text x="41" y="${ty - 6}" text-anchor="middle">${esc(b.tag || "")}</text></g>
          <text class="lg-btitle bnd" x="64" y="${ty - 5}">${esc(titles[0] || "")}</text>
          <text class="lg-bsub" x="24" y="${ty + 13}">${esc(subs[0] || "")}</text></g>`;
        B.ty = ty;
        return;
      }
      const bw = Math.max(34, (b.tag || "").length * 6.4 + 14);
      s += `<g class="lg-bandg tn-${B.tone}"><rect class="lg-band" x="12" y="${B.y}" width="976" height="${B.h}" rx="12"/>`;
      s += `<line class="lg-divider" x1="${LG.X0 - 14}" y1="${B.y + 12}" x2="${LG.X0 - 14}" y2="${B.y + B.h - 12}"/>`;
      s += `<g class="lg-badge"><rect x="24" y="${B.y + 14}" width="${bw}" height="17" rx="5"/><text x="${24 + bw / 2}" y="${B.y + 26}" text-anchor="middle">${esc(b.tag || "")}</text></g>`;
      titles.forEach((t, k) => { s += `<text class="lg-btitle" x="24" y="${B.y + 48 + k * 14}">${esc(t)}</text>`; });
      subs.forEach((t, k) => { s += `<text class="lg-bsub" x="24" y="${B.y + 52 + titles.length * 14 + k * 12}">${esc(t)}</text>`; });
      s += `</g>`;
    });
    edges.forEach((E) => {
      s += `<path id="${id}-e${E.i}" class="lg-edge ${E.kind || "call"}" data-e="${E.i}" d="${E.d}" marker-end="url(#${id}-m-${E.kind || "call"})"/>`;
    });
    // markers where edges cross a boundary band
    const boundaries = Object.values(bands).filter((B) => B.boundary);
    boundaries.forEach((bnd) => {
      edges.forEach((E) => {
        if (!E.cubic || E.markerX !== undefined) return;
        const [p0, p1, p2, p3] = E.cubic;
        if (!((p0[1] - bnd.ty) * (p3[1] - bnd.ty) < 0)) return;
        let best = null;
        for (let t = 0; t <= 1.0001; t += 0.01) {
          const u = 1 - t;
          const yy = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
          const xx = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
          if (!best || Math.abs(yy - bnd.ty) < best.dy) best = { dy: Math.abs(yy - bnd.ty), x: xx };
        }
        const m = E.marker || bnd.marker || bnd.tag || "";
        const mw = m.length * 6 + 12;
        E.markerX = best.x;
        s += `<g class="lg-cross tn-${bnd.tone}" data-e="${E.i}" data-tip="${esc(`${m}${S.tooltipSep}${E.label || S.layered.boundary}`)}"><rect x="${best.x - mw / 2}" y="${bnd.ty - 8}" width="${mw}" height="16" rx="4"/><text x="${best.x}" y="${bnd.ty + 3.5}" text-anchor="middle">${esc(m)}</text></g>`;
      });
    });
    Object.values(nodes).forEach((n) => {
      const tip = n.tip !== undefined ? n.tip : termTip(n.title) || termTip(n.sub || "");
      const cls = `lg-node tn-${n._tone}` + (n.hl ? " hl" : "") + (n.soft ? " soft" : "");
      const tx = n._x + 12, avail = n._w - 22;
      const big = n.title.length * 6.9 <= avail;
      const tLines = big ? [n.title] : wrap(n.title, Math.floor(avail / 5.95), 2);
      const extraRows = Math.max(0, Math.round((n._h - NODE_H) / (NODE_H + LG.ROW_GAP))) * 3;
      const sLines = n.sub ? wrap(n.sub, Math.floor(avail / 5.75), (tLines.length > 1 ? 1 : 2) + extraRows) : [];
      let ty = n._y + (n.tag ? 30 : 22);
      let body = tLines.map((l, k) => `<text class="lg-title${big ? "" : " sm"}" x="${tx}" y="${ty + k * 12.5}">${esc(l)}</text>`).join("");
      ty += (tLines.length - 1) * 12.5 + 13;
      body += sLines.map((l, k) => `<text class="lg-sub" x="${tx}" y="${ty + k * 11.5}">${esc(l)}</text>`).join("");
      s += `<g class="${cls}" data-id="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.title + (n.sub ? ", " + n.sub : ""))}"${tip ? ` data-tip="${esc(tip)}"` : ""}>
        <rect class="lg-card" x="${n._x}" y="${n._y}" width="${n._w}" height="${n._h}" rx="9"/>
        ${n.tag ? `<text class="lg-tag" x="${tx}" y="${n._y + 15}">[${esc(n.tag)}]</text>` : ""}${body}</g>`;
    });
    const placed = [];
    const hits = (x, y, w) => placed.some((p) => x < p.x + p.w + 4 && x + w + 4 > p.x && y - 9 < p.y + 2 && y + 2 > p.y - 9);
    edges.forEach((E) => {
      if (!E.label || E.markerX !== undefined) return;
      let mx, my;
      if (E.cubic) {
        const w = E.label.length * 5.8;
        mx = Math.min((E.cubic[0][0] + E.cubic[3][0]) / 2 + 6, 992 - w); my = (E.cubic[0][1] + E.cubic[3][1]) / 2 + 3;
        for (let k = 0; k < 4 && hits(mx, my, w); k++) my += 12;
        placed.push({ x: mx, y: my, w });
      } else if (E.side) {
        const xr = E.side === "right" ? Math.max(E.a._x + E.a._w, E.b._x + E.b._w) + 16 : Math.min(E.a._x, E.b._x) - 16;
        const yy = (E.s[1] + E.t[1]) / 2;
        const lxp = xr + (E.side === "right" ? 10 : -4);
        s += `<text class="lg-elabel" data-e="${E.i}" x="${lxp}" y="${yy}" text-anchor="middle" transform="rotate(-90 ${lxp} ${yy})">${esc(E.label)}</text>`;
        return;
      } else {
        if (E.label.length * 5.8 > Math.abs(E.t[0] - E.s[0]) - 8) return;
        mx = (E.s[0] + E.t[0]) / 2; my = (E.s[1] + E.t[1]) / 2 - 6;
      }
      s += `<text class="lg-elabel" data-e="${E.i}" x="${mx}" y="${my}"${!E.cubic && !E.side ? ' text-anchor="middle"' : ""}>${esc(E.label)}</text>`;
    });

    const kinds = [...new Set(edges.map((E) => E.kind || "call"))];
    // spec.toneLabels renames the colour legend for non-AUTOSAR diagrams (e.g. a bus matrix); content text, so it comes from the page
    const toneNames = { ...S.layered.tones, ...(spec.toneLabels || {}) };
    const tones = Object.keys(S.layered.tones).filter((t) => Object.values(nodes).some((n) => n._tone === t));
    host.classList.add("lg-host");
    host.innerHTML = `<svg class="lg-svg" viewBox="0 0 1000 ${H}" role="group" aria-label="${esc(spec.label || S.layered.ariaDefault)}">${s}</svg>
      <div class="lg-legend lg-tones">${tones.map((t) => `<span class="tn-${t}"><b></b>${esc(toneNames[t])}</span>`).join("")}</div>
      <div class="lg-legend">${kinds.map((k) => `<span class="${k}"><i></i>${esc(S.layered.kinds[k] || k)}</span>`).join("")}${boundaries.length ? `<span class="bnd"><i></i>${esc(S.layered.boundary)}</span>` : ""}<span class="hint">${esc(S.layered.hint)}</span></div>`;

    // ---- interaction: highlight direct connections, dim everything else
    const svg = host.querySelector("svg");
    const adj = {};
    edges.forEach((E) => { (adj[E.from] = adj[E.from] || []).push(E); (adj[E.to] = adj[E.to] || []).push(E); });
    let current = null;
    const clear = () => {
      current = null;
      svg.classList.remove("lg-focus");
      svg.querySelectorAll(".lit").forEach((el) => el.classList.remove("lit", "focus"));
      svg.querySelectorAll(".hd-pulse.live").forEach((p) => p.remove());
    };
    const focus = (nid) => {
      if (current === nid) return;
      clear();
      current = nid;
      svg.classList.add("lg-focus");
      const lit = new Set([nid]);
      (adj[nid] || []).forEach((E) => {
        lit.add(E.from); lit.add(E.to);
        svg.querySelectorAll(`[data-e="${E.i}"]`).forEach((el) => el.classList.add("lit"));
        D.attachPulse(svg.querySelector(`#${id}-e${E.i}`), E.kind === "hw" ? "hw" : "hl", 1.5);
      });
      lit.forEach((k) => { const g = svg.querySelector(`.lg-node[data-id="${k}"]`); if (g) g.classList.add("lit"); });
      const self = svg.querySelector(`.lg-node[data-id="${nid}"]`);
      if (self) self.classList.add("focus");
    };
    svg.addEventListener("pointerover", (e) => { const g = e.target.closest(".lg-node"); if (g) focus(g.dataset.id); else if (current) clear(); });
    svg.addEventListener("pointerleave", clear);
    svg.addEventListener("focusin", (e) => { const g = e.target.closest(".lg-node"); if (g) focus(g.dataset.id); });
    svg.addEventListener("focusout", clear);
    return { focus, clear };
  };

  window.MCU.Diagram = D;
})();
