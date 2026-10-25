/* SPDX-License-Identifier: MIT
   Module 07 · Timers, PWM and Input Capture. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, Waveform, Wave, Calc, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  Calc.widget($("#calc-timer"), "timer", { defaults: { clk: 72000000, freq: 1000 } });
  Register($("#reg-tim-cr1"), { reg: "TIM_CR1", value: 0x00000081 });
  const NOTES = {
    1: ["Clock TIM3", "TIM3 is on APB1, so its enable bit is in <code>RCC_APB1ENR</code>; GPIOA (for PA6) is on APB2."],
    2: ["PA6 to the timer", "Alternate-function push-pull hands the pin to TIM3's channel 1 output. 2 MHz edges are plenty for 1 kHz."],
    3: ["Prescaler", "2 × PCLK1 = 72 MHz timer clock; dividing by 72 gives 1 MHz, so one count is 1 µs."],
    4: ["Period", "1000 counts per period: 1 kHz, fast enough that the eye sees steady brightness."],
    5: ["PWM mode 1 with preload", "<code>OC1M = 110</code>: output high while <code>CNT &lt; CCR1</code>. <code>OC1PE</code> makes CCR1 changes take effect at the next update."],
    6: ["Enable the output", "Without <code>CC1E</code> the channel compares but the pin stays idle."],
    7: ["Load the shadow registers", "PSC and preloaded registers only take effect at an update event. Setting <code>UG</code> forces one now."],
    8: ["Change the duty", "Clamped to the period. Thanks to preload it applies cleanly at the start of the next period."],
    9: ["Two channels, one pin", "<code>CC1S = 01</code> maps IC1 to TI1 (PA0); <code>CC2S = 10</code> maps IC2 to TI1 as well."],
    10: ["Edges", "Channel 1 captures rising edges; channel 2 (<code>CC2P</code>) captures falling edges."],
    11: ["Reset on rising edge", "Trigger = filtered TI1, slave mode = reset: the counter restarts at every rising edge, so CCR1 holds the period and CCR2 the high time, in µs."],
    12: ["Every 10 ms", "The same signed-difference deadline test as the scheduler in module 06."],
    13: ["Read the capture", "With the jumper fitted, these are the last measured period and high time of the PWM on PA6."],
  };
  explore("#ex-pwm", "src-03-pwm", NOTES);
  explore("#ex-capture", "src-03-capture", NOTES);
  explore("#ex-breath", "src-03-breath", {
    1: ["Triangle", "Folds the step into a ramp up and down: 0 … half … 0."],
    2: ["Squared", "(x / half)² × top, in integers. Squaring makes the slow, dark part of the ramp longer, which looks linear to the eye. The 64-bit intermediate avoids overflow for any 32-bit input."],
  });
  Register($("#reg-ccmr1"), { reg: "TIM_CCMR1", value: 0x00000068, show: ["OC1M", "OC1PE", "CC1S", "OC2M", "CC2S"] });

  const wv = Waveform($("#wv-pwm"), Wave.pwm({ arr: 999, ccr: 250, periods: 3 }));
  const ccr = $("#pwm-ccr"), arr = $("#pwm-arr"), out = $("#pwm-out");
  const update = () => {
    const a = +arr.value;
    ccr.max = String(a + 1);
    const c = Math.min(+ccr.value, a + 1);
    const spec = Wave.pwm({ arr: a, ccr: c, periods: 3 });
    wv.update(spec);
    out.textContent = `duty = ${c} / ${a + 1} = ${(100 * spec.duty).toFixed(1)} %, f = 72 MHz / 72 / ${a + 1} = ${(1e6 / (a + 1)).toFixed(1)} Hz`;
  };
  ccr.addEventListener("input", update);
  arr.addEventListener("change", update);
  update();

  Pinout($("#po-tim"), { board: "bluepill", mode: "functions", highlight: ["PA6", "PA0"] });
  Checklist($("#ck-timers"), [
    "You can compute PSC and ARR for a given frequency and say why TIM3 counts at 72 MHz.",
    "Example 03 breathes the LED on PA6 smoothly (no flicker, no glitches).",
    "With the PA6–PA0 jumper, the capture reports a 1000 µs period and a high time that follows the duty.",
    "You know why <code>OC1PE</code>, <code>ARPE</code> and the initial <code>UG</code> are there.",
  ], { key: "timers" });
})();
