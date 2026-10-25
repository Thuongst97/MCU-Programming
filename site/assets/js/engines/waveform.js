/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — waveform renderer + protocol generators (PLAN.md §9.5).
   MCU.Waveform(host, spec) draws timing diagrams in our own SVG.
     spec = { signals: [{ name, wave, data?, labels? } | { name, analog: [[t, v0..1], …] }],
              bands?: [{ from, to, text, cls }]   (shaded spans across all signals, in cells)
              marks?: [{ at, text }]               (vertical markers),
              hscale?: px per cell, title? }
     wave characters: 0 1 (levels), . (extend previous cell), = (bus cell labelled from data[]),
                      x (unknown), z (high impedance), | (gap)
   MCU.Wave.uart/spi/i2c/pwm/can(...) return such specs; they are pure and unit-tested.
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MCU = root.MCU || {};
    root.MCU.Waveform = api.mount;
    root.MCU.Wave = api.Wave;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex2 = (b) => "0x" + (b & 0xff).toString(16).toUpperCase().padStart(2, "0");
  const bitsOf = (v, n, msbFirst = true) => Array.from({ length: n }, (_, i) => (v >> (msbFirst ? n - 1 - i : i)) & 1);

  /* ------------------------------------------------------------ generators */
  const Wave = {
    /** UART frame, LSB first: idle, start (0), data bits, optional parity, stop bit(s) (1). */
    uart({ byte = 0x48, bits = 8, parity = "none", stop = 1, idle = 2 } = {}) {
      const data = bitsOf(byte, bits, false);
      const ones = data.reduce((a, b) => a + b, 0);
      const par = parity === "even" ? ones & 1 : parity === "odd" ? (ones & 1) ^ 1 : null;
      const levels = [...Array(idle).fill(1), 0, ...data, ...(par === null ? [] : [par]), ...Array(stop).fill(1), 1];
      const labels = [...Array(idle).fill(""), "S", ...data.map((_, i) => "D" + i), ...(par === null ? [] : ["P"]), ...Array(stop).fill("Stop"), ""];
      const first = idle, last = idle + 1 + bits + (par === null ? 0 : 1);
      const bands = [
        { from: idle, to: idle + 1, text: "start", cls: "b-start" },
        { from: idle + 1, to: idle + 1 + bits, text: `data ${hex2(byte)} (LSB first)`, cls: "b-data" },
      ];
      if (par !== null) bands.push({ from: idle + 1 + bits, to: last, text: "parity", cls: "b-crc" });
      bands.push({ from: last, to: last + stop, text: "stop", cls: "b-stop" });
      return { signals: [{ name: "TX", wave: levels.join(""), labels }], bands, frameBits: last + stop - first };
    },

    /** SPI transfer of n bytes, MSB first, in half-bit cells. mode = CPOL*2 + CPHA. */
    spi({ mode = 0, mosi = [0x9f], miso = [0xef], bits = 8 } = {}) {
      const cpol = (mode >> 1) & 1, cpha = mode & 1;
      const n = Math.max(mosi.length, miso.length);
      const mo = [], mi = [];
      for (let k = 0; k < n; k++) { mo.push(...bitsOf(mosi[k] || 0, bits)); mi.push(...bitsOf(miso[k] || 0, bits)); }
      const idle = String(cpol);
      const lead = cpol ? "0" : "1", trail = cpol ? "1" : "0";
      let cs = "1", sck = idle, d_o = "x", d_i = "z";
      cs += "0"; sck += idle; d_o += "x"; d_i += "z";
      // CPHA=0: data valid before the first edge (leading edge samples); CPHA=1: data changes on the leading edge.
      if (!cpha) { d_o = d_o.slice(0, -1) + mo[0]; d_i = d_i.slice(0, -1) + mi[0]; }
      mo.forEach((b, i) => {
        sck += lead + trail;
        if (!cpha) { d_o += b + "" + (i + 1 < mo.length ? mo[i + 1] : "x"); d_i += mi[i] + "" + (i + 1 < mi.length ? mi[i + 1] : "z"); }
        else { d_o += b + "" + b; d_i += mi[i] + "" + mi[i]; }
      });
      cs += "0".repeat(mo.length * 2) + "11"; sck += idle + idle; d_o += "xx"; d_i += "zz";
      // sampling edge: leading edge (CPHA = 0) or trailing edge (CPHA = 1) of each clock pulse
      const sample = [];
      for (let i = 0; i < mo.length; i++) sample.push({ at: 2 + i * 2 + cpha, text: "" });
      return {
        signals: [{ name: "CS", wave: cs }, { name: "SCK", wave: sck }, { name: "MOSI", wave: d_o }, { name: "MISO", wave: d_i }],
        bands: mosi.map((b, k) => ({ from: 2 + k * bits * 2, to: 2 + (k + 1) * bits * 2, text: `MOSI ${hex2(b)} · MISO ${hex2(miso[k] || 0)}`, cls: k % 2 ? "b-data2" : "b-data" })),
        marks: sample.map((m) => ({ at: m.at, text: "", cls: "m-sample" })),
        cpol, cpha,
      };
    },

    /** I2C write/read: START, 7-bit address + R/W, ACK, data bytes with ACK/NACK, STOP. 4 cells per bit. */
    i2c({ addr = 0x3c, rw = 0, bytes = [0x00, 0xaf], acks } = {}) {
      const frame = [{ bits: [...bitsOf(addr, 7), rw], text: `addr ${hex2(addr)} + ${rw ? "R" : "W"}` }, ...bytes.map((b) => ({ bits: bitsOf(b, 8), text: hex2(b) }))];
      const ackList = acks || frame.map((_, i) => (rw && i === frame.length - 1 ? 1 : 0)); // master NACKs the last read byte
      let scl = "11", sda = "10"; // idle, then START: SDA falls while SCL high
      const bands = [{ from: 1, to: 2, text: "START", cls: "b-start" }];
      // each bit is 4 cells: SCL low, high, high, low; SDA changes one cell after SCL falls, never while SCL is high
      let t = 2, prev = 0;
      const bit = (b) => { scl += "0110"; sda += `${prev}${b}${b}${b}`; prev = b; t += 4; };
      frame.forEach((f, k) => {
        const from = t;
        f.bits.forEach(bit);
        bands.push({ from, to: t, text: f.text, cls: k ? "b-data" : "b-id" });
        const a = ackList[k];
        bands.push({ from: t, to: t + 4, text: a ? "NACK" : "ACK", cls: a ? "b-nack" : "b-ack" });
        bit(a);
      });
      scl += "0111"; sda += `${prev}001`; // STOP: SDA rises while SCL is high
      bands.push({ from: t + 2, to: t + 4, text: "STOP", cls: "b-stop" });
      return { signals: [{ name: "SCL", wave: scl }, { name: "SDA", wave: sda }], bands };
    },

    /** PWM mode 1, edge-aligned up-counting: output high while CNT < CCR. Counter drawn as a sawtooth. */
    pwm({ arr = 999, ccr = 250, periods = 3, cells = 40 } = {}) {
      const top = arr + 1;
      const duty = Math.max(0, Math.min(1, ccr / top));
      const hi = Math.round(duty * cells);
      const wave = ("1".repeat(hi) + "0".repeat(cells - hi)).repeat(periods);
      const analog = [];
      for (let p = 0; p < periods; p++) { analog.push([p * cells, 0], [(p + 1) * cells - 0.001, 1]); }
      analog.push([periods * cells, 0]);
      return {
        signals: [{ name: "CNT", analog, ref: duty, refText: "CCR" }, { name: "OC", wave }],
        bands: Array.from({ length: periods }, (_, p) => ({ from: p * cells, to: (p + 1) * cells, text: p ? "" : `period = (ARR+1) ticks = ${top}`, cls: "b-period" })),
        duty,
      };
    },

    /** CRC-15/CAN over an array of bits (ISO 11898-1 generator polynomial 0x4599). */
    crc15(bits) {
      let crc = 0;
      bits.forEach((b) => {
        const nxt = b ^ ((crc >> 14) & 1);
        crc = (crc << 1) & 0x7fff;
        if (nxt) crc ^= 0x4599;
      });
      return crc;
    },

    /** Classic CAN data frame (11-bit ID) with CRC and bit stuffing, field by field. */
    can({ id = 0x3a0, rtr = 0, data = [0x05, 0x00], acked = true } = {}) {
      const dlc = Math.min(8, data.length);
      const fields = [
        ["SOF", [0]], ["ID", bitsOf(id & 0x7ff, 11)], ["RTR", [rtr]], ["IDE", [0]], ["r0", [0]], ["DLC", bitsOf(dlc, 4)],
        ...(rtr ? [] : data.slice(0, dlc).map((b, i) => [`D${i}`, bitsOf(b, 8)])),
      ];
      const crcIn = fields.flatMap((f) => f[1]);
      const crc = Wave.crc15(crcIn);
      fields.push(["CRC", bitsOf(crc, 15)]);
      // stuffing from SOF to the end of the CRC sequence
      const out = [];
      let run = 0, last = -1;
      fields.forEach(([name, bits]) => {
        bits.forEach((b) => {
          out.push({ v: b, field: name, stuff: false });
          run = b === last ? run + 1 : 1; last = b;
          if (run === 5) { const s = 1 - b; out.push({ v: s, field: name, stuff: true }); last = s; run = 1; }
        });
      });
      const tail = [["CRC del", [1]], ["ACK", [acked ? 0 : 1]], ["ACK del", [1]], ["EOF", [1, 1, 1, 1, 1, 1, 1]]];
      tail.forEach(([name, bits]) => bits.forEach((b) => out.push({ v: b, field: name, stuff: false })));
      const bands = [];
      out.forEach((b, i) => {
        const cur = bands[bands.length - 1];
        if (cur && cur.text === b.field) cur.to = i + 1;
        else bands.push({ from: i, to: i + 1, text: b.field, cls: "f-" + b.field.replace(/\W/g, "").replace(/^D\d$/, "data").toLowerCase() });
      });
      const stuffCount = out.filter((b) => b.stuff).length;
      return {
        signals: [{ name: "CAN", wave: out.map((b) => b.v).join(""), labels: out.map((b) => (b.stuff ? "s" : "")) }],
        bands, marks: out.map((b, i) => (b.stuff ? { at: i + 0.5, text: "", cls: "m-stuff" } : null)).filter(Boolean),
        crc, stuffCount, bitCount: out.length, crcInput: crcIn,
      };
    },
  };

  /* ------------------------------------------------------------ renderer */
  function layout(spec) {
    const len = Math.max(...spec.signals.map((s) => (s.wave ? s.wave.length : s.analog ? s.analog[s.analog.length - 1][0] : 0)));
    const hscale = spec.hscale || Math.max(8, Math.min(40, Math.floor(820 / Math.max(1, len))));
    return { len, hscale };
  }

  function render(spec) {
    const { len, hscale } = layout(spec);
    const NAME_W = 64, ROW = 44, AMP = 22, TOP = spec.bands ? 30 : 10;
    const W = NAME_W + len * hscale + (spec.signals.some((x) => x.refText) ? 52 : 16);
    const H = TOP + spec.signals.length * ROW + 10;
    const X = (t) => NAME_W + t * hscale;
    let s = "";
    (spec.bands || []).forEach((b, i) => {
      s += `<g class="wv-band ${b.cls || ""}"><rect x="${X(b.from)}" y="${TOP - 4}" width="${(b.to - b.from) * hscale}" height="${H - TOP - 4}"/>`;
      if (b.text) {
        const w = (b.to - b.from) * hscale;
        const fits = b.text.length * 6.2 < w + 4;
        // a label that does not fit is staggered upwards if the band is reasonably wide, otherwise
        // left out of the drawing (it stays available as a tooltip on the band)
        if (fits || w >= 26) s += `<text x="${X(b.from) + w / 2}" y="${TOP - 10 - (fits ? 0 : (i % 2) * 11)}" text-anchor="middle">${esc(fits || b.text.length < 9 ? b.text : b.text.slice(0, 6) + "…")}</text>`;
        s += `<title>${esc(b.text)}</title>`;
      }
      s += `</g>`;
    });
    spec.signals.forEach((sig, r) => {
      const y0 = TOP + r * ROW + 8, yHi = y0, yLo = y0 + AMP, yMid = y0 + AMP / 2;
      s += `<text class="wv-name" x="${NAME_W - 10}" y="${yMid + 4}" text-anchor="end">${esc(sig.name)}</text>`;
      if (sig.analog) {
        const pts = sig.analog.map(([t, v]) => `${X(t).toFixed(1)},${(yLo - v * AMP).toFixed(1)}`).join(" ");
        s += `<polyline class="wv-analog" points="${pts}"/>`;
        if (sig.ref !== undefined) {
          const yr = yLo - sig.ref * AMP;
          s += `<line class="wv-ref" x1="${X(0)}" y1="${yr}" x2="${X(len)}" y2="${yr}"/><text class="wv-reftext" x="${X(len) + 3}" y="${yr + 4}">${esc(sig.refText || "")}</text>`;
        }
        return;
      }
      let d = "", prev = null, di = 0;
      const chars = sig.wave.split("");
      chars.forEach((c, t) => {
        if (c === ".") c = prev;
        const x0 = X(t), x1 = X(t + 1);
        if (c === "0" || c === "1") {
          const y = c === "1" ? yHi : yLo;
          if (prev === "0" || prev === "1") d += prev !== c ? ` L${x0},${y}` : "";
          else d += ` M${x0},${y}`;
          d += ` L${x1},${y}`;
        } else if (c === "=" || c === "x") {
          s += `<path class="wv-bus${c === "x" ? " x" : ""}" d="M${x0},${yMid} L${x0 + 3},${yHi} L${x1 - 3},${yHi} L${x1},${yMid} L${x1 - 3},${yLo} L${x0 + 3},${yLo} Z"/>`;
          if (c === "=" && sig.data) s += `<text class="wv-data" x="${(x0 + x1) / 2}" y="${yMid + 4}" text-anchor="middle">${esc(sig.data[di++] || "")}</text>`;
        } else if (c === "z") {
          s += `<line class="wv-z" x1="${x0}" y1="${yMid}" x2="${x1}" y2="${yMid}"/>`;
        }
        if (sig.labels && sig.labels[t]) s += `<text class="wv-lbl${sig.labels[t] === "s" ? " stuff" : ""}" x="${(x0 + x1) / 2}" y="${yLo + 12}" text-anchor="middle">${esc(sig.labels[t])}</text>`;
        prev = c;
      });
      if (d) s += `<path class="wv-line" d="${d.trim()}"/>`;
    });
    (spec.marks || []).forEach((m) => {
      s += `<line class="wv-mark ${m.cls || ""}" x1="${X(m.at)}" y1="${TOP - 4}" x2="${X(m.at)}" y2="${H - 6}"/>`;
      if (m.text) s += `<text class="wv-marktext" x="${X(m.at) + 3}" y="${TOP + 6}">${esc(m.text)}</text>`;
    });
    return `<svg class="wv-svg" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 1400)}px" role="img" aria-label="${esc(spec.title || "Timing diagram")}">${s}</svg>`;
  }

  /** mount(host, spec | () => spec). Returns { update(spec) } so pages can bind controls to generators. */
  function mount(host, spec) {
    host.classList.add("wv-host");
    const draw = (sp) => { host.innerHTML = `<div class="wv-canvas">${render(sp)}</div>`; };
    draw(spec);
    return { update: draw };
  }

  return { mount, render, Wave };
});
