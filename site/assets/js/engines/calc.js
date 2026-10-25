/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — calculators (PLAN.md §9.9): USART BRR, timer PSC/ARR, bxCAN
   bit timing. The math is pure and unit-tested; the widgets bind inputs to it.
     MCU.Calc.brr(pclk, baud)                      → { usartdiv, mantissa, fraction, brr, actual, errorPct }
     MCU.Calc.timer({ clk, freq })                 → [{ psc, arr, actual, errorPct }]   best first
     MCU.Calc.canTiming({ pclk, bitrate, sp, sjw }) → [{ brp, tq, ts1, ts2, sjw, sp, btr, errorPct }]  best first
     MCU.Calc.widget(host, "brr" | "timer" | "can", { defaults, onResult })
   Limits: USART BRR (RM0008 §27.3.4), TIMx PSC/ARR 16 bit (§15.4), CAN_BTR fields (§24.7.7);
   TS2 is kept at 2 tq or more.
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

  /** USART baud-rate register for 16x oversampling: USARTDIV = fPCLK / (16 × baud), 4 fraction bits. */
  function brr(pclk, baud) {
    const usartdiv = pclk / (16 * baud);
    let mantissa = Math.floor(usartdiv);
    let fraction = Math.round((usartdiv - mantissa) * 16);
    if (fraction === 16) { mantissa += 1; fraction = 0; }
    const value = (mantissa << 4) | fraction;
    const actual = pclk / (16 * (mantissa + fraction / 16));
    return { usartdiv, mantissa, fraction, brr: value, actual, errorPct: (100 * (actual - baud)) / baud, valid: mantissa >= 1 && mantissa <= 0xfff };
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

  /** bxCAN bit timing: 1 tq sync + (TS1+1) + (TS2+1) quanta per bit; sample point = (1 + TS1+1) / N. */
  function canTiming({ pclk, bitrate, sp = 0.875, sjw = 1 }) {
    const out = [];
    for (let brp = 1; brp <= 1024; brp++) {
      const n = pclk / (brp * bitrate);
      if (Math.abs(n - Math.round(n)) > 1e-9) continue;
      const N = Math.round(n);
      if (N < 8 || N > 25) continue;             // 1 + (1..16) + (1..8) quanta, practical minimum 8
      // quanta before the sample point (excluding sync); keep at least 2 tq after it, because a
      // node needs time to process the sampled bit (information processing time)
      let t1 = Math.round(sp * N) - 1;
      t1 = Math.max(1, Math.min(16, t1, N - 3));
      const t2 = N - 1 - t1;
      if (t2 < 2 || t2 > 8) continue;
      const s = Math.min(sjw, 4, t2);
      const real = (1 + t1) / N;
      out.push({ brp, tq: N, ts1: t1, ts2: t2, sjw: s, sp: real,
        btr: (((s - 1) & 3) << 24) | (((t2 - 1) & 7) << 20) | (((t1 - 1) & 15) << 16) | ((brp - 1) & 0x3ff),
        errorPct: 100 * (real - sp) });
    }
    out.sort((a, b) => Math.abs(a.errorPct) - Math.abs(b.errorPct) || b.tq - a.tq);
    return out;
  }

  /* ------------------------------------------------------------ widgets */
  const FORMS = {
    brr: {
      inputs: [["pclk", "fPCLK (Hz)", 72000000], ["baud", "baud", 115200]],
      run: (v, S) => {
        const r = brr(v.pclk, v.baud);
        return { result: r, html: `<table class="t"><tbody>
          <tr><td>USARTDIV</td><td><code>${r.usartdiv.toFixed(4)}</code></td></tr>
          <tr><td>${S.mantissa} / ${S.fraction}</td><td><code>${r.mantissa}</code> / <code>${r.fraction}</code>/16</td></tr>
          <tr><td><code>USART_BRR</code></td><td><code>${hex(r.brr, 4)}</code></td></tr>
          <tr><td>${S.actual}</td><td>${r.actual.toFixed(1)} baud</td></tr>
          <tr><td>${S.error}</td><td class="${Math.abs(r.errorPct) > 2 ? "calc-bad" : "calc-ok"}">${r.errorPct.toFixed(3)} %</td></tr></tbody></table>` };
      },
    },
    timer: {
      inputs: [["clk", "Timer clock (Hz)", 72000000], ["freq", "Update frequency (Hz)", 1000]],
      run: (v, S) => {
        const list = timer({ clk: v.clk, freq: v.freq });
        return { result: list[0], html: list.length ? `<table class="t"><thead><tr><th>PSC</th><th>ARR</th><th>${S.actual}</th><th>${S.error}</th></tr></thead><tbody>${list.map((r) =>
          `<tr><td><code>${r.psc}</code></td><td><code>${r.arr}</code></td><td>${mhz(r.actual)}</td><td>${r.errorPct.toFixed(4)} %</td></tr>`).join("")}</tbody></table>` : `<p class="calc-bad">${S.none}</p>` };
      },
    },
    can: {
      inputs: [["pclk", "PCLK1 (Hz)", 36000000], ["bitrate", "Bit rate (bit/s)", 500000], ["sp", "Sample point (%)", 87.5], ["sjw", "SJW (tq)", 1]],
      run: (v, S) => {
        const list = canTiming({ pclk: v.pclk, bitrate: v.bitrate, sp: v.sp / 100, sjw: v.sjw });
        return { result: list[0], html: list.length ? `<table class="t"><thead><tr><th>BRP</th><th>${S.tq}</th><th>TS1</th><th>TS2</th><th>SJW</th><th>${S.sp}</th><th><code>CAN_BTR</code></th></tr></thead><tbody>${list.slice(0, 6).map((r, i) =>
          `<tr${i ? "" : ' class="calc-best"'}><td>${r.brp}</td><td>${r.tq}</td><td>${r.ts1}</td><td>${r.ts2}</td><td>${r.sjw}</td><td>${(100 * r.sp).toFixed(1)} %</td><td><code>${hex(r.btr)}</code></td></tr>`).join("")}</tbody></table>
          <p class="small muted">${S.canNote}</p>` : `<p class="calc-bad">${S.none}</p>` };
      },
    },
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
