/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — STM32G4 clock-tree configurator (PLAN.md §9.4).
   MCU.ClockTree(host, { config, register, pllRegister })
     register / pllRegister: MCU.Register instances for RCC_CFGR / RCC_PLLCFGR (optional)
   The pure function compute(config) gives every frequency, the limit violations,
   the FLASH_ACR.LATENCY required and the RCC_CFGR / RCC_PLLCFGR values; unit-tested
   in Node. Limits from ST's G4 LL/HAL sources (stm32g4xx_ll_utils.c, hal_rcc.h):
   PLL input after PLLM 2.66–16 MHz, VCO 64–344 MHz, PLLN 8–127, SYSCLK ≤ 170 MHz in
   range 1 boost (≤ 150 MHz normal), wait states by HCLK (boost: 34/68/102/136 MHz
   steps; normal: 30/60/90/120), the AHB ÷ 2 step for SYSCLK > 80 MHz (RM0440 RCC),
   timer clock ×2 when an APB prescaler is not 1.
   ========================================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.MCU = root.MCU || {};
    root.MCU.ClockTree = api.mount;
    root.MCU.ClockTree.compute = api.compute;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = 1e6;
  const HPRE = { 1: 0, 2: 8, 4: 9, 8: 10, 16: 11, 64: 12, 128: 13, 256: 14, 512: 15 };
  const PPRE = { 1: 0, 2: 4, 4: 5, 8: 6, 16: 7 };
  const HSE = 24 * M;   // X3 on the NUCLEO-G474RE (ST's NUCLEO BSP)
  const DEFAULT = { src: "hsi", m: 4, n: 85, r: 2, sw: "pll", hpre: 1, ppre1: 1, ppre2: 1, boost: true };
  const RESET = { src: "hsi", m: 1, n: 16, r: 2, sw: "hsi", hpre: 1, ppre1: 1, ppre2: 1, boost: false };

  function compute(cfg) {
    const c = { ...DEFAULT, ...cfg };
    const pllIn = (c.src === "hse" ? HSE : 16 * M) / c.m;
    const vco = pllIn * c.n;
    const pll = vco / c.r;
    const sysclk = c.sw === "pll" ? pll : c.sw === "hse" ? HSE : 16 * M;
    const hclk = sysclk / c.hpre;
    const pclk1 = hclk / c.ppre1, pclk2 = hclk / c.ppre2;
    const tim1 = c.ppre1 === 1 ? pclk1 : pclk1 * 2;   // TIM2–7 (APB1)
    const tim2 = c.ppre2 === 1 ? pclk2 : pclk2 * 2;   // TIM1/8/15–17/20 (APB2)
    const steps = c.boost ? [34, 68, 102, 136] : [30, 60, 90, 120];
    const latency = steps.filter((x) => hclk > x * M).length;
    const v = [];
    const lim = (ok, key, text) => { if (!ok) v.push({ key, text }); };
    if (c.sw === "pll") {
      lim(pllIn >= 2.66 * M && pllIn <= 16 * M, "pllin", "PLL input after PLLM must be 2.66–16 MHz");
      lim(vco >= 64 * M && vco <= 344 * M, "pll", "VCO (input × PLLN) must be 64–344 MHz");
    }
    const max = c.boost ? 170 : 150;
    lim(sysclk <= max * M, "sysclk", c.boost ? "SYSCLK ≤ 170 MHz (range 1 boost)" : "SYSCLK ≤ 150 MHz without boost: clear PWR_CR5.R1MODE for more");
    lim(pclk1 <= 170 * M, "pclk1", "APB1 (PCLK1) ≤ 170 MHz");
    lim(pclk2 <= 170 * M, "pclk2", "APB2 (PCLK2) ≤ 170 MHz");
    const cfgr = ((c.sw === "pll" ? 3 : c.sw === "hse" ? 2 : 1)) | (HPRE[c.hpre] << 4) | (PPRE[c.ppre1] << 8) | (PPRE[c.ppre2] << 11);
    const sws = (cfgr & 3) << 2;   // what SWS reads back once the switch has happened
    const pllcfgr = (c.src === "hse" ? 3 : 2) | ((c.m - 1) << 4) | (c.n << 8) | (c.sw === "pll" ? 1 << 24 : 0) | (((c.r / 2) - 1) << 25);
    return { cfg: c, pllIn, vco, pll, sysclk, hclk, pclk1, pclk2, tim1, tim2, adc: hclk / 4, latency, stepAhb: c.sw === "pll" && sysclk > 80 * M,
      violations: v, cfgr: (cfgr | sws) >>> 0, pllcfgr: pllcfgr >>> 0, ok: v.length === 0 };
  }

  const f = (hz) => (hz >= M ? +(hz / M).toFixed(3) + " MHz" : +(hz / 1e3).toFixed(1) + " kHz");

  function mount(host, opts = {}) {
    const S = window.MCU_STRINGS.clocktree;
    let cfg = { ...DEFAULT, ...(opts.config || {}) };
    const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const sel = (k, list, fmt = (x) => x) => `<label><span>${esc(S.ctl[k])}</span><select data-k="${k}">${list.map((x) => `<option value="${x}">${esc(fmt(x))}</option>`).join("")}</select></label>`;
    host.classList.add("clk-host", "glass");
    host.innerHTML = `<div class="clk-controls">
        ${sel("src", ["hsi", "hse"], (x) => S.src[x])}
        ${sel("m", range(1, 16), (x) => "÷" + x)}
        ${sel("n", range(8, 127), (x) => "×" + x)}
        ${sel("r", [2, 4, 6, 8], (x) => "÷" + x)}
        ${sel("sw", ["hsi", "hse", "pll"], (x) => S.sw[x])}
        ${sel("hpre", Object.keys(HPRE).map(Number), (x) => "÷" + x)}
        ${sel("ppre1", Object.keys(PPRE).map(Number), (x) => "÷" + x)}
        ${sel("ppre2", Object.keys(PPRE).map(Number), (x) => "÷" + x)}
        <div class="clk-presets"><button type="button" class="btn sm" data-preset="reset">${esc(S.presetReset)}</button><button type="button" class="btn sm primary" data-preset="max">${esc(S.presetMax)}</button></div>
      </div>
      <div class="clk-canvas"></div>
      <div class="clk-out" aria-live="polite"></div>`;
    const canvas = host.querySelector(".clk-canvas"), out = host.querySelector(".clk-out");

    const draw = () => {
      const r = compute(cfg);
      const bad = new Set(r.violations.map((x) => x.key));
      const node = (x, y, w, title, val, key, on = true) =>
        `<g class="clk-node${bad.has(key) ? " bad" : ""}${on ? "" : " off"}" data-tip="${esc(title + " — " + val)}"><rect x="${x}" y="${y}" width="${w}" height="42" rx="8"/><text class="clk-t" x="${x + w / 2}" y="${y + 17}" text-anchor="middle">${esc(title)}</text><text class="clk-v" x="${x + w / 2}" y="${y + 33}" text-anchor="middle">${esc(val)}</text></g>`;
      const wire = (d, on = true) => `<path class="clk-wire${on ? " on" : ""}" d="${d}"/>`;
      const pllOn = cfg.sw === "pll";
      let s = "";
      s += node(10, 20, 110, "HSI16 RC", "16 MHz", "hsi", cfg.sw === "hsi" || (pllOn && cfg.src === "hsi"));
      s += node(10, 120, 110, "HSE (X3)", f(HSE), "hse", cfg.sw === "hse" || (pllOn && cfg.src === "hse"));
      s += node(150, 70, 90, `PLLM ÷${cfg.m}`, f(r.pllIn), "pllin", pllOn);
      s += node(260, 70, 100, `PLLN ×${cfg.n}`, "VCO " + f(r.vco), "pll", pllOn);
      s += node(380, 70, 90, `PLLR ÷${cfg.r}`, f(r.pll), "pllr", pllOn);
      s += node(490, 70, 100, "SW mux", "SYSCLK " + f(r.sysclk), "sysclk");
      s += node(610, 70, 100, `AHB ÷${cfg.hpre}`, "HCLK " + f(r.hclk), "hclk");
      s += node(740, 0, 120, `APB1 ÷${cfg.ppre1}`, "PCLK1 " + f(r.pclk1), "pclk1");
      s += node(880, 0, 110, "TIM2–7", f(r.tim1), "tim1");
      s += node(740, 70, 120, `APB2 ÷${cfg.ppre2}`, "PCLK2 " + f(r.pclk2), "pclk2");
      s += node(880, 70, 110, "TIM1/8/15–20", f(r.tim2), "tim2");
      s += node(740, 140, 120, "ADC12 (HCLK ÷ 4)", f(r.adc), "adc");
      s += node(490, 160, 220, "Cortex-M4 core, SysTick, DMA", "HCLK " + f(r.hclk), "core");
      s += wire("M120,41 C135,41 135,91 150,91", cfg.src === "hsi" && pllOn);
      s += wire("M120,141 C135,141 135,91 150,91", cfg.src === "hse" && pllOn);
      s += wire("M240,91 H260", pllOn);
      s += wire("M360,91 H380", pllOn);
      s += wire("M470,91 H490", pllOn);
      s += wire("M120,35 C320,35 440,80 490,84", cfg.sw === "hsi");
      s += wire("M120,147 C320,147 440,100 490,98", cfg.sw === "hse");
      s += wire("M590,91 H610");
      s += wire("M710,91 C725,91 725,21 740,21");
      s += wire("M710,91 H740");
      s += wire("M860,21 H880");
      s += wire("M860,91 H880");
      s += wire("M710,96 C725,96 725,161 740,161");
      s += wire("M660,112 V160");
      canvas.innerHTML = `<svg viewBox="0 0 1000 210" role="img" aria-label="${esc(S.aria)}">${s}</svg>`;
      out.innerHTML = `<div class="clk-summary">
          <span>${esc(S.latency)} <b>FLASH_ACR.LATENCY = ${r.latency}</b></span>
          <span><code>RCC_PLLCFGR = 0x${r.pllcfgr.toString(16).toUpperCase().padStart(8, "0")}</code></span>
          <span><code>RCC_CFGR = 0x${r.cfgr.toString(16).toUpperCase().padStart(8, "0")}</code></span>
          <label class="clk-usb"><input type="checkbox" data-k="boost"${cfg.boost ? " checked" : ""}> ${esc(S.boost)}</label>
        </div>
        ${r.stepAhb ? `<p class="small muted">${esc(S.ahbStep)}</p>` : ""}
        ${r.violations.length ? `<ul class="clk-viol">${r.violations.map((x) => `<li>⚠ ${esc(x.text)}</li>`).join("")}</ul>` : `<p class="clk-okmsg">✓ ${esc(S.allOk)}</p>`}`;
      host.querySelectorAll("select[data-k]").forEach((el) => { el.value = String(cfg[el.dataset.k]); });
      if (opts.register) opts.register.set(r.cfgr);
      if (opts.pllRegister) opts.pllRegister.set(r.pllcfgr);
      if (opts.onChange) opts.onChange(r);
    };
    host.addEventListener("change", (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      if (k === "boost") cfg.boost = e.target.checked;
      else cfg[k] = /^(src|sw)$/.test(k) ? e.target.value : Number(e.target.value);
      draw();
    });
    host.addEventListener("click", (e) => {
      const p = e.target.closest("[data-preset]");
      if (!p) return;
      cfg = { ...(p.dataset.preset === "reset" ? RESET : DEFAULT) };
      draw();
    });
    draw();
    return { set(c) { cfg = { ...cfg, ...c }; draw(); }, get result() { return compute(cfg); } };
  }

  return { compute, mount, DEFAULT, RESET };
});
