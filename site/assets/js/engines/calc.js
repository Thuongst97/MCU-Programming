/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — calculators (PLAN.md §9.9): USART/LPUART BRR, timer PSC/ARR,
   FDCAN bit timing. The math is pure and unit-tested; the widgets bind inputs to it.
     MCU.Calc.brr(clk, baud)                        → { usart: {brr, actual, errorPct, valid}, lpuart: {…} }
     MCU.Calc.timer({ clk, freq })                  → [{ psc, arr, actual, errorPct }]   best first
     MCU.Calc.canTiming({ clk, bitrate, sp, data }) → [{ brp, tq, ts1, ts2, sjw, sp, reg, errorPct }]  best first
     MCU.Calc.widget(host, "brr" | "timer" | "can" | "canData", { defaults, onResult })
   Formulas (RM0440): USART with 16× oversampling BRR = f_ck ÷ baud (≥ 16); LPUART
   BRR = 256 × f_ck ÷ baud (0x300 … 0xFFFFF); TIMx PSC/ARR 16 bit; FDCAN_NBTP / _DBTP
   field limits. canTiming follows example 11's can_timing_calc() exactly: smallest
   prescaler first, 8–25 quanta per bit, sample point rounded down.
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.MCU = root.MCU || {}; root.MCU.Calc = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hex = (v, d = 8) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(d, "0");
  const mhz = (f) => (f >= 1e6 ? +(f / 1e6).toFixed(4) + " MHz" : f >= 1e3 ? +(f / 1e3).toFixed(3) + " kHz" : +f.toFixed(3) + " Hz");

  /** USART (16× oversampling) and LPUART baud-rate registers for the same kernel clock. */
  function brr(clk, baud) {
    const u = Math.round(clk / baud);
    const l = Math.round((256 * clk) / baud);
    const usart = { brr: u, actual: clk / u, valid: u >= 16 && u <= 0xffff };
    const lpuart = { brr: l, actual: (256 * clk) / l, valid: l >= 0x300 && l <= 0xfffff };
    for (const r of [usart, lpuart]) r.errorPct = (100 * (r.actual - baud)) / baud;
    return { usart, lpuart };
  }

  /** Timer PSC/ARR for an update frequency; prefers the largest ARR (finest PWM resolution) among exact-ish fits. */
  function timer({ clk, freq, max = 65535 }) {
    const total = clk / freq;
    const out = [];
    for (let psc = 0; psc <= max; psc++) {
      const arr = Math.round(total / (psc + 1)) - 1;
      if (arr > max) continue;
      if (arr < 1) break;
      const actual = clk / ((psc + 1) * (arr + 1));
      out.push({ psc, arr, actual, errorPct: (100 * (actual - freq)) / freq });
      if (out.length > 4000) break;
    }
    out.sort((a, b) => Math.abs(a.errorPct) - Math.abs(b.errorPct) || b.arr - a.arr);
    return out.slice(0, 5);
  }

  /** FDCAN bit timing, same rules as can_timing_calc() in example 11: 1 sync quantum + tseg1 + tseg2;
   *  sample point after 1 + tseg1 quanta, rounded down; SJW = min(tseg2, field maximum).
   *  data = false: FDCAN_NBTP (arbitration phase), true: FDCAN_DBTP (CAN FD data phase). */
  const NOMINAL = { brp: 512, ts1: 256, ts2: 128, sjw: 128 }, DATA = { brp: 32, ts1: 32, ts2: 16, sjw: 16 };
  function canTiming({ clk, bitrate, sp = 0.875, data = false }) {
    const lim = data ? DATA : NOMINAL;
    const spm = Math.round(sp * 1000);
    const out = [];
    for (let brp = 1; brp <= lim.brp; brp++) {
      if (clk % (brp * bitrate) !== 0) continue;               // only exact bit rates
      const tq = clk / (brp * bitrate);
      if (tq > 25) continue;
      if (tq < 8) break;
      const before = Math.floor((tq * spm) / 1000);             // 1 + tseg1
      if (before < 2) continue;
      const ts1 = before - 1, ts2 = tq - before;
      if (ts1 > lim.ts1 || ts2 < 1 || ts2 > lim.ts2) continue;
      const sjw = Math.min(ts2, lim.sjw);
      const reg = data
        ? (((brp - 1) << 16) | ((ts1 - 1) << 8) | ((ts2 - 1) << 4) | (sjw - 1)) >>> 0
        : (((sjw - 1) << 25) | ((brp - 1) << 16) | ((ts1 - 1) << 8) | (ts2 - 1)) >>> 0;
      const real = before / tq;
      out.push({ brp, tq, ts1, ts2, sjw, sp: real, reg, errorPct: 100 * (real - sp) });
    }
    return out;
  }

  /* ------------------------------------------------------------ widgets */
  const canForm = (data) => ({
    inputs: [["clk", "FDCAN kernel clock (Hz)", 170000000], ["bitrate", "Bit rate (bit/s)", data ? 1000000 : 500000], ["sp", "Sample point (%)", data ? 75 : 87.5]],
    run: (v, S) => {
      const list = canTiming({ clk: v.clk, bitrate: v.bitrate, sp: v.sp / 100, data });
      const reg = data ? "FDCAN_DBTP" : "FDCAN_NBTP";
      return { result: list[0], html: list.length ? `<table class="t"><thead><tr><th>BRP</th><th>${S.tq}</th><th>TSEG1</th><th>TSEG2</th><th>SJW</th><th>${S.sp}</th><th><code>${reg}</code></th></tr></thead><tbody>${list.slice(0, 6).map((r, i) =>
        `<tr${i ? "" : ' class="calc-best"'}><td>${r.brp}</td><td>${r.tq}</td><td>${r.ts1}</td><td>${r.ts2}</td><td>${r.sjw}</td><td>${(100 * r.sp).toFixed(1)} %</td><td><code>${hex(r.reg)}</code></td></tr>`).join("")}</tbody></table>
        <p class="small muted">${S.canNote}</p>` : `<p class="calc-bad">${S.none}</p>` };
    },
  });
  const FORMS = {
    brr: {
      inputs: [["clk", "Kernel clock (Hz)", 170000000], ["baud", "baud", 115200]],
      run: (v, S) => {
        const r = brr(v.clk, v.baud);
        const row = (name, x) => `<tr><td>${name}</td><td><code>${hex(x.brr, 5)}</code> (${x.brr})</td><td>${x.actual.toFixed(1)} baud</td><td class="${!x.valid || Math.abs(x.errorPct) > 2 ? "calc-bad" : "calc-ok"}">${x.valid ? x.errorPct.toFixed(3) + " %" : S.outOfRange}</td></tr>`;
        return { result: r, html: `<table class="t"><thead><tr><th></th><th><code>BRR</code></th><th>${S.actual}</th><th>${S.error}</th></tr></thead><tbody>
          ${row(S.usart, r.usart)}${row(S.lpuart, r.lpuart)}</tbody></table>` };
      },
    },
    timer: {
      inputs: [["clk", "Timer clock (Hz)", 170000000], ["freq", "Update frequency (Hz)", 1000]],
      run: (v, S) => {
        const list = timer({ clk: v.clk, freq: v.freq });
        return { result: list[0], html: list.length ? `<table class="t"><thead><tr><th>PSC</th><th>ARR</th><th>${S.actual}</th><th>${S.error}</th></tr></thead><tbody>${list.map((r) =>
          `<tr><td><code>${r.psc}</code></td><td><code>${r.arr}</code></td><td>${mhz(r.actual)}</td><td>${r.errorPct.toFixed(4)} %</td></tr>`).join("")}</tbody></table>` : `<p class="calc-bad">${S.none}</p>` };
      },
    },
    can: canForm(false),
    canData: canForm(true),
  };

  function widget(host, kind, opts = {}) {
    const S = window.MCU_STRINGS.calc;
    const F = FORMS[kind];
    if (!F) throw new Error(`Calc: unknown widget "${kind}"`);
    const vals = Object.fromEntries(F.inputs.map(([k, , d]) => [k, (opts.defaults && opts.defaults[k]) ?? d]));
    const uid = "calc" + Math.random().toString(36).slice(2, 7);
    host.classList.add("calc-host", "glass");
    host.innerHTML = `<div class="calc-title"><b>${esc(S.titles[kind])}</b></div>
      <div class="calc-inputs">${F.inputs.map(([k, label]) => `<label for="${uid}-${k}">${esc(label)}<input id="${uid}-${k}" data-k="${k}" type="number" step="any" min="0" value="${vals[k]}"></label>`).join("")}</div>
      <div class="calc-out" aria-live="polite"></div>`;
    const out = host.querySelector(".calc-out");
    const run = () => {
      const r = F.run(vals, S);
      out.innerHTML = r.html;
      if (opts.onResult) opts.onResult(r.result, vals);
    };
    host.addEventListener("input", (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v) && v > 0) { vals[k] = v; run(); }
    });
    run();
    return { set(k, v) { vals[k] = v; host.querySelector(`[data-k="${k}"]`).value = v; run(); } };
  }

  return { brr, timer, canTiming, widget, hex, mhz };
});
