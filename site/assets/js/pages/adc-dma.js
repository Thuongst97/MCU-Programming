/* SPDX-License-Identifier: MIT
   Module 09 · ADC and DMA. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, SequenceDiagram, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  /* ------------------------------------------------ SAR binary search */
  const host = $("#sar-viz");
  host.innerHTML = `<div class="wv-controls"><label for="sar-v">Input voltage <input id="sar-v" type="range" min="0" max="3300" value="1650"></label><span id="sar-out" class="mono small"></span></div><div id="sar-svg"></div>`;
  const draw = () => {
    const mv = +$("#sar-v").value;
    const target = Math.min(4095, Math.floor((mv / 3300) * 4096));
    let code = 0, s = "";
    const W = 760, H = 180, X0 = 40, step = (W - X0 - 10) / 12, y = (v) => H - 20 - (v / 4096) * (H - 40);
    s += `<line class="sar-in" x1="${X0}" y1="${y(target)}" x2="${W - 10}" y2="${y(target)}"/><text class="sar-lbl" x="${X0 + 4}" y="${y(target) - 5}">input ≈ ${target}</text>`;
    for (let b = 11; b >= 0; b--) {
      const trial = code | (1 << b);
      const keep = trial <= target;
      if (keep) code = trial;
      const i = 11 - b, x = X0 + i * step;
      s += `<g class="sar-step ${keep ? "keep" : "drop"}"><rect x="${x + 4}" y="${y(trial)}" width="${step - 8}" height="${H - 20 - y(trial)}"/>
        <text x="${x + step / 2}" y="${H - 4}" text-anchor="middle">b${b}=${keep ? 1 : 0}</text></g>`;
    }
    $("#sar-svg").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Successive approximation: 12 trial voltages">${s}</svg>`;
    $("#sar-out").textContent = `${(mv / 1000).toFixed(3)} V → code ${code} = 0b${code.toString(2).padStart(12, "0")}`;
  };
  $("#sar-v").addEventListener("input", draw);
  draw();

  const N05 = {
    1: ["Two clocks", "GPIOA for the pin and ADC1 itself. The ADC's conversion clock comes from PCLK2 ÷ ADCPRE, set to ÷ 6 = 12 MHz by the clock code (maximum 14 MHz)."],
    2: ["Analog mode", "MODE = 00 and CNF = 00 disconnect the digital input buffer from the pin, which would otherwise draw current and add noise."],
    3: ["Sampling time", "239.5 cycles (20 µs at 12 MHz) gives the sampling capacitor time to charge through a 10 kΩ potentiometer."],
    4: ["Power up", "The first write of <code>ADON</code> wakes the ADC. <code>TSVREFE</code> connects the internal reference and temperature sensor. <code>EXTSEL = 111</code> with <code>EXTTRIG</code> makes the <code>SWSTART</code> bit the trigger."],
    5: ["Calibrate", "Reset the calibration registers, then run self-calibration once after power-up (RM0008 §11.4). Both bits clear themselves when done; the waits have timeouts."],
    6: ["One channel", "Sequence length 1 (<code>SQR1.L = 0</code>), first conversion = the requested channel."],
    7: ["Start", "Software trigger."],
    8: ["Wait for EOC", "End of conversion. Reading <code>DR</code> returns the result right-aligned and clears <code>EOC</code>."],
    9: ["Peripheral and memory addresses", "DMA copies from the ADC data register to our buffer."],
    10: ["Circular, 16-bit", "Memory address increments, peripheral address stays; half-words on both sides; at the end of the buffer the channel starts again at the beginning."],
    11: ["Scan two channels", "PA1 then Vrefint, again and again. Results land interleaved: even slots PA1, odd slots Vrefint."],
    12: ["Continuous + DMA", "The ADC restarts itself after each sequence and requests a DMA transfer after each conversion. The CPU is no longer involved."],
    13: ["Average whenever you like", "The buffer is always full of recent samples; reading it costs nothing but the averaging loop."],
    14: ["No samples?", "If the DMA never ran, the Vrefint mean is 0. The program says so instead of printing nonsense (this is what happens in Renode)."],
  };
  ["init", "single", "dma", "main"].forEach((r) => explore(`#ex-${r}`, `src-05-${r}`, N05));
  explore("#ex-math", "src-05-math", {
    1: ["Supply from the reference", "Vrefint is about 1.20 V whatever VDDA is. If it reads 1489, VDDA = 1.20 V × 4095 ÷ 1489 = 3.30 V."],
    2: ["Pin voltage without knowing VDDA", "VDDA cancels out: pin = raw × 1.20 V ÷ vrefint_raw. Integer arithmetic with rounding; no floating point on a core without an FPU."],
    3: ["Mean of one channel", "Walk the interleaved buffer with a stride of 2."],
  });
  Register($("#reg-adccr2"), { reg: "ADC_CR2", value: 0x009e0001 });
  Pinout($("#po-adc"), { board: "bluepill", mode: "wiring", ...window.MCU_DATA.wiring["05"] });
  Register($("#reg-dmaccr"), { reg: "DMA_CCR", value: 0x000005a1 });

  SequenceDiagram($("#seq-dma"), {
    ariaLabel: "ADC conversion results moved to SRAM by DMA",
    laneW: 170,
    lanes: [
      { title: "ADC1", sub: "scan + continuous", tone: "hw" },
      { title: "DMA1 ch1", sub: "circular", tone: "tool" },
      { title: "SRAM", sub: "s_buf[64]", tone: "svc" },
      { title: "CPU", sub: "main()", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "dma", label: "request (EOC)", title: "A conversion finishes", detail: "<p>With <code>ADC_CR2.DMA</code> set, end of conversion raises a request on DMA1 channel 1 instead of waiting for the CPU.</p>" },
      { from: 1, to: 0, kind: "bus", label: "read ADC1->DR", title: "DMA reads the result", detail: "<p>The DMA controller takes a bus cycle and reads 16 bits from <code>CPAR</code>. Reading <code>DR</code> clears <code>EOC</code>, just as a CPU read would.</p>" },
      { from: 1, to: 2, kind: "dma", label: "write s_buf[i]", title: "…and stores it", detail: "<p>It writes the half-word to <code>CMAR</code>, then increments the memory address and decrements <code>CNDTR</code>.</p>", analogy: "A conveyor belt that drops each finished part into the next free slot of a rack." },
      { from: 1, to: 1, label: "CNDTR = 0 → reload", title: "Wrap around", detail: "<p>In circular mode the counter and addresses reload automatically. With <code>HTIE</code>/<code>TCIE</code> the channel can also interrupt at the half and at the end.</p>" },
      { from: 3, to: 2, kind: "ret", label: "read + average", title: "The CPU only reads results", detail: "<p>Thousands of conversions per second cost the CPU nothing; it averages the buffer whenever it needs a value.</p>" },
    ],
  });

  Checklist($("#ck-adc"), [
    "You can explain how a SAR ADC finds 12 bits in 12 steps, and why sampling time matters.",
    "Example 05 prints about 1650 mV with the pot in the middle, and the value follows the knob.",
    "Part 2 prints averaged readings: DMA is running and the CPU only averages.",
    "You know which DMA channel serves ADC1 and what circular mode does.",
  ], { key: "adc-dma" });
})();
