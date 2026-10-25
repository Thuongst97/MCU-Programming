/* SPDX-License-Identifier: MIT
   Appendix D · ST's LL Drivers. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Compare } = window.MCU;
  renderCodeExplorer($("#ex-ll-io"), { ...embedded("src-ll-io"), notes: {
    5: ["One call, three clocks", "<code>LL_APB2_GRP1_EnableClock</code> is <code>RCC-&gt;APB2ENR |= mask</code> plus a read-back."],
    6: ["Pin mode", "Hides the F1's CRL/CRH split: the function picks the right register and shift for pin 13."],
    7: ["Baud rate helper", "Computes <code>USART_BRR</code> from the clock you pass in: correct only if that clock is."],
  } });
  Compare($("#cmp-clock"), { bad: "src-bare-clock", good: "src-ll-clock", rule: ["Same registers, other names"],
    why: "Both versions perform the same steps in the same order: HSE on and wait, flash wait states, PLL ×9, switch and confirm. LL replaces bit masks with function names; it does not add the timeouts, the order or the checks: those are still your job." });
  $("#cmp-clock .cmp-col.bad .cmp-tag").textContent = "Registers (CMSIS)";
  $("#cmp-clock .cmp-col.good .cmp-tag").textContent = "LL";
})();
