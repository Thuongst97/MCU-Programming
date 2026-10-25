/* SPDX-License-Identifier: MIT
   =========================================================================
   MCU Academy — STM32F1 clock-tree configurator (PLAN.md §9.4).
   MCU.ClockTree(host, { config, register: MCU.Register instance (optional) })
   The pure function compute(config) gives every frequency, the limit violations,
   the FLASH_ACR.LATENCY required and the RCC_CFGR value; unit-tested in Node.
   Limits: DS5319 (PLL 16–72 MHz output, HSE 4–16 MHz) and RM0008 §7.2
   (SYSCLK/HCLK/PCLK2 ≤ 72 MHz, PCLK1 ≤ 36 MHz, ADC ≤ 14 MHz, USB = 48 MHz,
   timer clock ×2 when the APB prescaler is not 1), flash latency PM0075.
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
  const ADCPRE = { 2: 0, 4: 1, 6: 2, 8: 3 };
  const DEFAULT = { hse: 8 * M, src: "hse", xtpre: 1, mul: 9, sw: "pll", hpre: 1, ppre1: 2, ppre2: 1, adcpre: 6, usbpre: 1.5, usb: false };
  const RESET = { hse: 8 * M, src: "hsi2", xtpre: 1, mul: 2, sw: "hsi", hpre: 1, ppre1: 1, ppre2: 1, adcpre: 2, usbpre: 1.5, usb: false };

  function compute(cfg) {
    const c = { ...DEFAULT, ...cfg };
    const pllIn = c.src === "hse" ? c.hse / c.xtpre : 4 * M;
    const pll = pllIn * c.mul;
    const sysclk = c.sw === "pll" ? pll : c.sw === "hse" ? c.hse : 8 * M;
    const hclk = sysclk / c.hpre;
    const pclk1 = hclk / c.ppre1, pclk2 = hclk / c.ppre2;
    const tim1 = c.ppre1 === 1 ? pclk1 : pclk1 * 2;   // TIM2–4 (APB1)
    const tim2 = c.ppre2 === 1 ? pclk2 : pclk2 * 2;   // TIM1 (APB2)
    const adc = pclk2 / c.adcpre;
    const usbclk = pll / c.usbpre;
    const latency = sysclk <= 24 * M ? 0 : sysclk <= 48 * M ? 1 : 2;   // PM0075: wait states follow SYSCLK
    const v = [];
    const lim = (ok, key, text) => { if (!ok) v.push({ key, text }); };
    if (c.src === "hse" || c.sw === "hse") lim(c.hse >= 4 * M && c.hse <= 16 * M, "hse", "HSE must be 4–16 MHz (DS5319)");
    if (c.sw === "pll" || c.usb) lim(pll >= 16 * M && pll <= 72 * M, "pll", "PLL output must be 16–72 MHz (DS5319)");
    lim(sysclk <= 72 * M, "sysclk", "SYSCLK ≤ 72 MHz");
    lim(pclk1 <= 36 * M, "pclk1", "APB1 (PCLK1) ≤ 36 MHz");
    lim(pclk2 <= 72 * M, "pclk2", "APB2 (PCLK2) ≤ 72 MHz");
    lim(adc <= 14 * M, "adc", "ADC clock ≤ 14 MHz");
    if (c.usb) lim(Math.abs(usbclk - 48 * M) < 1, "usb", "USB needs exactly 48 MHz");
    const cfgr = ((c.sw === "pll" ? 2 : c.sw === "hse" ? 1 : 0)) | (HPRE[c.hpre] << 4) | (PPRE[c.ppre1] << 8) | (PPRE[c.ppre2] << 11) |
      (ADCPRE[c.adcpre] << 14) | ((c.src === "hse" ? 1 : 0) << 16) | ((c.xtpre === 2 ? 1 : 0) << 17) | (((c.mul - 2) & 15) << 18) | ((c.usbpre === 1 ? 1 : 0) << 22);
    const sws = (cfgr & 3) << 2;   // what SWS reads back once the switch has happened
    return { cfg: c, pllIn, pll, sysclk, hclk, pclk1, pclk2, tim1, tim2, adc, usbclk, latency, violations: v, cfgr: (cfgr | sws) >>> 0, ok: v.length === 0 };
  }

  const f = (hz) => (hz >= M ? +(hz / M).toFixed(3) + " MHz" : +(hz / 1e3).toFixed(1) + " kHz");

  function mount(host, opts = {}) {
    const S = window.MCU_STRINGS.clocktree;
    let cfg = { ...DEFAULT, ...(opts.config || {}) };
    const sel = (k, list, fmt = (x) => x) => `<label><span>${esc(S.ctl[k])}</span><select data-k="${k}">${list.map((x) => `<option value="${x}">${esc(fmt(x))}</option>`).join("")}</select></label>`;
    host.classList.add("clk-host", "glass");
    host.innerHTML = `<div class="clk-controls">
        ${sel("src", ["hse", "hsi2"], (x) => S.src[x])}
        ${sel("xtpre", [1, 2], (x) => (x === 1 ? "÷1" : "÷2"))}
        ${sel("mul", [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], (x) => "×" + x)}
        ${sel("sw", ["hsi", "hse", "pll"], (x) => S.sw[x])}
        ${sel("hpre", Object.keys(HPRE).map(Number), (x) => "÷" + x)}
        ${sel("ppre1", Object.keys(PPRE).map(Number), (x) => "÷" + x)}
        ${sel("ppre2", Object.keys(PPRE).map(Number), (x) => "÷" + x)}
        ${sel("adcpre", Object.keys(ADCPRE).map(Number), (x) => "÷" + x)}
        ${sel("usbpre", [1.5, 1], (x) => "÷" + x)}
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
      // sources
      s += node(10, 20, 110, "HSI RC", "8 MHz", "hsi", cfg.sw === "hsi" || cfg.src === "hsi2");
      s += node(10, 120, 110, "HSE crystal", f(cfg.hse), "hse", cfg.sw === "hse" || cfg.src === "hse");
      s += node(160, 70, 100, "PLLSRC", cfg.src === "hse" ? (cfg.xtpre === 2 ? "HSE ÷ 2" : "HSE") : "HSI ÷ 2", "pllsrc", pllOn);
      s += node(290, 70, 100, `PLL ×${cfg.mul}`, f(r.pll), "pll", pllOn || cfg.usb);
      s += node(430, 70, 100, "SW mux", "SYSCLK " + f(r.sysclk), "sysclk");
      s += node(570, 70, 100, `AHB ÷${cfg.hpre}`, "HCLK " + f(r.hclk), "hclk");
      s += node(720, 0, 120, `APB1 ÷${cfg.ppre1}`, "PCLK1 " + f(r.pclk1), "pclk1");
      s += node(880, 0, 110, "TIM2–4", f(r.tim1), "tim1");
      s += node(720, 70, 120, `APB2 ÷${cfg.ppre2}`, "PCLK2 " + f(r.pclk2), "pclk2");
      s += node(880, 70, 110, "TIM1", f(r.tim2), "tim2");
      s += node(720, 140, 120, `ADC ÷${cfg.adcpre}`, f(r.adc), "adc");
      s += node(430, 160, 100, `USB ÷${cfg.usbpre}`, f(r.usbclk), "usb", cfg.usb);
      s += node(570, 160, 100, "Cortex SysTick", "HCLK / HCLK÷8", "systick");
      s += wire("M120,41 C140,41 140,91 160,91", cfg.src === "hsi2" && pllOn);
      s += wire("M120,141 C140,141 140,91 160,91", cfg.src === "hse" && pllOn);
      s += wire("M260,91 H290", pllOn);
      s += wire("M390,91 H430", pllOn);
      s += wire("M120,35 C300,35 380,80 430,84", cfg.sw === "hsi");
      s += wire("M120,147 C300,147 380,100 430,98", cfg.sw === "hse");
      s += wire("M530,91 H570");
      s += wire("M670,91 C690,91 700,21 720,21");
      s += wire("M670,91 H720");
      s += wire("M840,21 H880");
      s += wire("M840,91 H880");
      s += wire("M780,112 V140");
      s += wire("M340,112 C340,181 400,181 430,181", cfg.usb);
      s += wire("M620,112 V160");
      canvas.innerHTML = `<svg viewBox="0 0 1000 210" role="img" aria-label="${esc(S.aria)}">${s}</svg>`;
      out.innerHTML = `<div class="clk-summary">
          <span>${esc(S.latency)} <b>FLASH_ACR.LATENCY = ${r.latency}</b></span>
          <span><code>RCC_CFGR = 0x${r.cfgr.toString(16).toUpperCase().padStart(8, "0")}</code></span>
          <label class="clk-usb"><input type="checkbox" data-k="usb"${cfg.usb ? " checked" : ""}> ${esc(S.useUsb)}</label>
        </div>
        ${r.violations.length ? `<ul class="clk-viol">${r.violations.map((x) => `<li>⚠ ${esc(x.text)}</li>`).join("")}</ul>` : `<p class="clk-okmsg">✓ ${esc(S.allOk)}</p>`}`;
      host.querySelectorAll("select[data-k]").forEach((el) => { el.value = String(cfg[el.dataset.k]); });
      if (opts.register) opts.register.set(r.cfgr);
      if (opts.onChange) opts.onChange(r);
    };
    host.addEventListener("change", (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      if (k === "usb") cfg.usb = e.target.checked;
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
