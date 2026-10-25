/* SPDX-License-Identifier: MIT
   Module 13 · Watchdogs, Reset Sources and Low Power. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Register($("#reg-csr"), { reg: "RCC_CSR", value: 0x24000000 });
  explore("#ex-boot", "src-08-boot", {
    14: ["Read before clearing", "Decode the flags, print them, then clear them with <code>RMVF</code> so the next boot reports only its own cause. The fault record in <code>.noinit</code> RAM is printed once and invalidated."],
  });
  explore("#ex-cause", "src-08-cause", {
    3: ["Most specific first", "Watchdogs and the software reset also set PINRSTF, so they are checked before it."],
    4: ["Power-on", "Set by the power-on/power-down reset circuit. A brown-out shows up here too."],
  });
  explore("#ex-iwdg", "src-08-iwdg", {
    2: ["Freeze while debugging", "Without this, sitting at a breakpoint for a second resets the chip."],
    3: ["Unlock", "PR and RLR are write-protected; 0x5555 unlocks them until the next reload."],
    4: ["Start", "0xCCCC starts the watchdog (and the LSI). From here, only a reset stops it."],
    5: ["Feed", "0xAAAA reloads the counter from RLR."],
  });
  const host = $("#iwdg-calc");
  host.innerHTML = `<div class="calc-inputs"><label for="iw-pr">Prescaler <select id="iw-pr">${[4, 8, 16, 32, 64, 128, 256].map((d, i) => `<option value="${i}"${i === 3 ? " selected" : ""}>÷${d} (PR = ${i})</option>`).join("")}</select></label>
    <label for="iw-rlr">Reload RLR (0–4095) <input id="iw-rlr" type="number" min="0" max="4095" value="1249"></label></div><div class="calc-out" id="iw-out"></div>`;
  const iw = () => {
    const pr = +$("#iw-pr").value, rlr = Math.max(0, Math.min(4095, +$("#iw-rlr").value || 0));
    const div = 4 << pr, t = (f) => (((rlr + 1) * div) / f) * 1000;
    $("#iw-out").innerHTML = `<table class="t"><tbody><tr><td>LSI 40 kHz (typical)</td><td><b>${t(40000).toFixed(1)} ms</b></td></tr><tr><td>LSI 60 kHz (fast chip)</td><td class="calc-bad">${t(60000).toFixed(1)} ms: feed faster than this</td></tr><tr><td>LSI 30 kHz (slow chip)</td><td>${t(30000).toFixed(1)} ms</td></tr></tbody></table>`;
  };
  host.addEventListener("input", iw);
  iw();
  Register($("#reg-iwdgpr"), { reg: "IWDG_PR", value: 3 });

  StateMachine($("#sm-power"), {
    ariaLabel: "STM32F1 low-power modes",
    initial: "run", height: 250, boxW: 170,
    states: [
      { id: "run", label: "Run", sub: "72 MHz", x: 40, y: 95, tone: "svc", desc: "<p>Everything clocked. Current scales with frequency and enabled peripherals.</p>" },
      { id: "sleep", label: "Sleep", sub: "CPU clock off", x: 400, y: 10, tone: "tool", desc: "<p>Only the core stops; peripherals, DMA and interrupts keep running. Wakes on any interrupt within a few cycles.</p>" },
      { id: "stop", label: "Stop", sub: "all 1.8 V clocks off", x: 400, y: 180, tone: "mcal", desc: "<p>PLL, HSI and HSE off; SRAM and registers kept. Wakes on an EXTI line, then runs on HSI.</p>" },
      { id: "standby", label: "Standby", sub: "1.8 V domain off", x: 780, y: 95, tone: "cdd", desc: "<p>Almost everything is lost; only the backup domain survives. Waking up is a reset: the program starts from the beginning and can read <code>PWR_CSR.SBF</code> to know it came from Standby.</p>" },
    ],
    transitions: [
      { from: "run", to: "sleep", label: "WFI" },
      { from: "sleep", to: "run", label: "any IRQ" },
      { from: "run", to: "stop", label: "SLEEPDEEP + WFI" },
      { from: "stop", to: "run", label: "EXTI → HSI" },
      { from: "run", to: "standby", label: "SLEEPDEEP + PDDS + WFI", bend: -50 },
      { from: "standby", to: "run", label: "WKUP / RTC → reset", bend: -50 },
    ],
  });
  Register($("#reg-pwrcr"), { reg: "PWR_CR", value: 0x00000001 });
  const N09 = {
    1: ["Sleep, not Stop", "With <code>SLEEPDEEP</code> clear, <code>WFI</code> only stops the CPU clock."],
    2: ["Wait for an interrupt", "Here SysTick wakes the CPU every millisecond, so this loop counts about 1000 wake-ups per second."],
    3: ["PWR clock", "The power controller's registers are on APB1 and need their clock enabled."],
    4: ["Stop, not Standby", "<code>PDDS = 0</code> selects Stop; <code>LPDS = 1</code> puts the voltage regulator in its low-power mode (lower current, slightly slower wake-up)."],
    5: ["Silence SysTick", "Its interrupt would wake the chip immediately."],
    6: ["Sleep deeply", "<code>__DSB()</code> makes sure all memory writes have completed before the core stops."],
    7: ["Rebuild the clock", "After Stop the chip runs on HSI 8 MHz: restart the HSE and PLL, then SysTick."],
    8: ["Let the UART finish", "Entering Stop stops the USART clock too; a byte still in the shift register would be cut off."],
  };
  ["sleep", "main", "stop"].forEach((r) => explore(`#ex-${r}`, `src-09-${r}`, N09));
  Register($("#reg-dbgmcu"), { reg: "DBGMCU_CR", value: 0x00000103 });
  Checklist($("#ck-power"), [
    "Example 08 prints the reset cause at boot, and pressing <code>w</code> leads to a watchdog reset about a second later.",
    "You can compute an IWDG timeout and explain why the LSI tolerance matters.",
    "Example 09 sleeps in Stop until you press the button, then prints <code>back at 72 MHz</code>.",
    "You can say what survives Stop and what survives Standby, and what the clock is after waking from Stop.",
  ], { key: "power-wdg" });
})();
