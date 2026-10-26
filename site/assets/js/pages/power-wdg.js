/* SPDX-License-Identifier: MIT
   Module 13 · Watchdogs, Reset Sources and Low Power. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Register($("#reg-csr"), { reg: "RCC_CSR", value: 0x0C000000 });
  explore("#ex-boot", "src-08-boot", {
    14: ["Read before clearing", "Decode the flags, print them, then clear them with <code>RMVF</code> so the next boot reports only its own cause. The fault record in <code>.noinit</code> RAM is printed once and invalidated."],
  });
  explore("#ex-cause", "src-08-cause", {
    3: ["Most specific first", "Watchdogs, the software reset and the low-power reset also set PINRSTF, so they are checked before it."],
    4: ["Power-on or brown-out", "The G4 has no separate power-on flag: <code>BORRSTF</code> is set at every power-on and on every brown-out."],
  });
  explore("#ex-iwdg", "src-08-iwdg", {
    2: ["Freeze while debugging", "<code>DBGMCU_APB1FZR1.DBG_IWDG_STOP</code>: without it, sitting at a breakpoint for a second resets the chip."],
    3: ["Unlock", "PR, RLR and WINR are write-protected; 0x5555 unlocks them until the next reload. The status register then shows when each new value has crossed into the LSI clock domain."],
    4: ["Start", "0xCCCC starts the watchdog (and the LSI). On the G4 the start comes first and the unlock second. From here, only a reset stops it."],
    5: ["Feed", "0xAAAA reloads the counter from RLR."],
  });
  const host = $("#iwdg-calc");
  host.innerHTML = `<div class="calc-inputs"><label for="iw-pr">Prescaler <select id="iw-pr">${[4, 8, 16, 32, 64, 128, 256].map((d, i) => `<option value="${i}"${i === 3 ? " selected" : ""}>÷${d} (PR = ${i})</option>`).join("")}</select></label>
    <label for="iw-rlr">Reload RLR (0–4095) <input id="iw-rlr" type="number" min="0" max="4095" value="999"></label></div><div class="calc-out" id="iw-out"></div>`;
  const iw = () => {
    const pr = +$("#iw-pr").value, rlr = Math.max(0, Math.min(4095, +$("#iw-rlr").value || 0));
    const div = 4 << pr, t = (f) => (((rlr + 1) * div) / f) * 1000;
    $("#iw-out").innerHTML = `<table class="t"><tbody><tr><td>LSI 32 kHz (typical)</td><td><b>${t(32000).toFixed(1)} ms</b></td></tr><tr><td>LSI +10 % (fast chip)</td><td class="calc-bad">${t(35200).toFixed(1)} ms: feed faster than this</td></tr><tr><td>LSI −10 % (slow chip)</td><td>${t(28800).toFixed(1)} ms</td></tr><tr><td colspan="2">±10 % is an illustration; take the real spread from DS12288 (LSI characteristics).</td></tr></tbody></table>`;
  };
  host.addEventListener("input", iw);
  iw();
  Register($("#reg-iwdgpr"), { reg: "IWDG_PR", value: 3 });

  StateMachine($("#sm-power"), {
    ariaLabel: "STM32G4 low-power modes",
    initial: "run", height: 370, boxW: 170,
    states: [
      { id: "run", label: "Run", sub: "170 MHz", x: 40, y: 160, tone: "svc", desc: "<p>Everything clocked. Current scales with frequency and enabled peripherals.</p>" },
      { id: "sleep", label: "Sleep", sub: "CPU clock off", x: 400, y: 10, tone: "tool", desc: "<p>Only the core stops; peripherals, DMA and interrupts keep running. Wakes on any interrupt within a few cycles.</p>" },
      { id: "stop", label: "Stop 0 / Stop 1", sub: "core-domain clocks off", x: 400, y: 300, tone: "mcal", desc: "<p>PLL and HSE off; SRAM and registers kept. Stop 1 (<code>LPMS = 1</code>, example 09) also switches to the low-power regulator. Wakes on an EXTI line, then runs on HSI16.</p>" },
      { id: "standby", label: "Standby", sub: "core domain off", x: 780, y: 100, tone: "cdd", desc: "<p>Almost everything is lost; the backup domain survives, and SRAM2 if <code>PWR_CR3.RRS</code> = 1. Waking up is a reset: the program starts from the beginning and can read <code>PWR_SR1.SBF</code> to know it came from Standby.</p>" },
      { id: "shutdown", label: "Shutdown", sub: "lowest current", x: 780, y: 220, tone: "cdd", desc: "<p>Even the brown-out detector is off; only the backup domain survives. Waking up looks like a power-on reset.</p>" },
    ],
    transitions: [
      { from: "run", to: "sleep", label: "WFI" },
      { from: "sleep", to: "run", label: "any IRQ" },
      { from: "run", to: "stop", label: "SLEEPDEEP + LPMS 0/1 + WFI" },
      { from: "stop", to: "run", label: "EXTI → HSI16" },
      { from: "run", to: "standby", label: "LPMS = 3 + WFI", bend: -10 },
      { from: "standby", to: "run", label: "WKUP / RTC → reset", bend: -10 },
      { from: "run", to: "shutdown", label: "LPMS = 4 + WFI", bend: 10 },
      { from: "shutdown", to: "run", label: "WKUP / RTC → POR", bend: 10 },
    ],
  });
  Register($("#reg-pwrcr"), { reg: "PWR_CR1", value: 0x00000201 });
  const N09 = {
    1: ["Sleep, not Stop", "With <code>SLEEPDEEP</code> clear, <code>WFI</code> only stops the CPU clock."],
    2: ["Wait for an interrupt", "Here SysTick wakes the CPU every millisecond, so this loop counts about 1000 wake-ups per second."],
    3: ["PWR clock", "The power controller's registers are on APB1: <code>RCC_APB1ENR1.PWREN</code>. The read-back makes sure the clock is on before the next access."],
    4: ["Stop 1", "<code>LPMS = 1</code> selects Stop 1: the main regulator is off and the low-power regulator keeps SRAM and registers. Stop 0 keeps the main regulator: faster wake-up, more current."],
    5: ["Silence SysTick", "Its interrupt would wake the chip immediately."],
    6: ["Sleep deeply", "<code>__DSB()</code> makes sure all memory writes have completed before the core stops."],
    7: ["Rebuild the clock", "After Stop the chip runs on HSI16 with the PLL off: run the whole 170 MHz bring-up again (boost, wait states, PLL, AHB ÷2 step), then SysTick."],
    8: ["Let the UART finish", "Entering Stop stops the USART clock too; a byte still in the shift register would be cut off."],
  };
  ["sleep", "main", "stop"].forEach((r) => explore(`#ex-${r}`, `src-09-${r}`, N09));
  Register($("#reg-dbgmcu"), { reg: "DBGMCU_CR", value: 0x00000003 });
  Register($("#reg-apb1fz"), { reg: "DBGMCU_APB1FZR1", value: 0x00001000 });
  Checklist($("#ck-power"), [
    "Example 08 prints the reset cause at boot on the ST-LINK virtual COM port, and pressing <code>w</code> leads to a watchdog reset about a second later.",
    "You can compute an IWDG timeout and explain why the LSI tolerance matters.",
    "Example 09 sleeps in Stop until you press the button, then prints <code>back at 170 MHz</code>.",
    "You can say what survives Stop, Standby and Shutdown, and what the clock is after waking from Stop.",
  ], { key: "power-wdg" });
})();
