/* SPDX-License-Identifier: MIT
   Appendix D · ST's LL Drivers. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Compare } = window.MCU;
  renderCodeExplorer($("#ex-ll-io"), { ...embedded("src-ll-io"), notes: {
    5: ["One call, one clock", "<code>LL_AHB2_GRP1_EnableClock</code> is <code>RCC-&gt;AHB2ENR |= mask</code> plus a read-back."],
    6: ["Pin mode", "Writes the two <code>MODE5</code> bits of <code>GPIOA_MODER</code>; the function computes the shift from the pin mask."],
    7: ["Baud rate helper", "Computes <code>LPUART1_BRR</code> (256 × clock / baud) from the clock you pass in: correct only if that clock is."],
  } });
  Compare($("#cmp-clock"), { bad: "src-bare-clock", good: "src-ll-clock", rule: ["Same registers, other names"],
    why: "Both versions perform the same steps in the same order: boost mode, flash wait states, PLL from HSI16 (÷4 ×85 ÷2), the AHB ÷2 step, switch and confirm. LL replaces bit masks with function names; it does not add the timeouts, the order or the checks: those are still your job." });
  $("#cmp-clock .cmp-col.bad .cmp-tag").textContent = "Registers (CMSIS)";
  $("#cmp-clock .cmp-col.good .cmp-tag").textContent = "LL";
})();
