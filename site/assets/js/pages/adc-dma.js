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
    1: ["One clock for two ADCs", "ADC1 and ADC2 share <code>ADC12EN</code> in <code>RCC_AHB2ENR</code> and a common register block, <code>ADC12_COMMON</code>. Its <code>CKMODE = 11</code> clocks them synchronously from HCLK ÷ 4 = 42.5 MHz; <code>VREFEN</code> switches the internal reference on."],
    2: ["Analog mode", "<code>MODE1 = 11</code>. It is also PA1's reset state, but writing it makes the intent explicit: the digital input buffer is disconnected, which saves current and noise."],
    3: ["1. Out of deep power-down, 2. regulator on", "The ADC starts in deep power-down. Clear <code>DEEPPWD</code>, set <code>ADVREGEN</code>, then wait the regulator's start-up time (20 µs maximum, DS12288). The code waits 1 ms, which is plenty."],
    4: ["3. Calibrate", "Single-ended calibration (<code>ADCALDIF = 0</code>), started with <code>ADCAL</code>, which hardware clears when done. Only possible while the ADC is disabled. The wait has a timeout."],
    5: ["Sampling time", "640.5 cycles (about 15 µs at 42.5 MHz) gives the sampling capacitor time to charge through a 10 kΩ pot. Channels 0–9 are in <code>SMPR1</code>, 10–18 in <code>SMPR2</code>."],
    6: ["One channel", "Sequence length 1 (<code>SQR1.L = 0</code>), first conversion = the requested channel."],
    7: ["Start", "<code>ADSTART</code> starts the regular sequence in software-trigger mode."],
    8: ["Wait for EOC", "End of conversion. Reading <code>DR</code> returns the result right-aligned and clears <code>EOC</code>."],
    9: ["DMAMUX: connect the request", "ADC1's request (ID 5) goes to DMAMUX channel 0, which drives DMA1 channel 1. Without this line the DMA channel never starts. DMA1 and DMAMUX1 both have clock bits in <code>RCC_AHB1ENR</code>."],
    10: ["Circular, 16-bit", "Memory address increments, peripheral address stays; half-words on both sides; at the end of the buffer the channel starts again at the beginning."],
    11: ["Two channels", "PA1 (channel 2) then Vrefint (channel 18), again and again. Results land interleaved: even slots PA1, odd slots Vrefint."],
    12: ["Continuous + DMA, forever", "<code>CONT</code> restarts the sequence by itself, <code>DMAEN</code> requests a transfer per conversion, <code>DMACFG</code> keeps doing so for a circular buffer, and <code>OVRMOD</code> lets a new result overwrite an unread one instead of stopping."],
    13: ["Average whenever you like", "The buffer is always full of recent samples; reading it costs nothing but the averaging loop."],
    14: ["No samples?", "If the DMA never ran, the Vrefint mean is 0. The program says so instead of printing nonsense. On real hardware this points at a missing DMAMUX request or a buffer in CCM SRAM."],
  };
  ["init", "single", "dma", "main"].forEach((r) => explore(`#ex-${r}`, `src-05-${r}`, N05));
  explore("#ex-math", "src-05-math", {
    1: ["Supply from the calibration", "<code>VREFINT_CAL</code> is what Vrefint read at VDDA = 3.0 V. Vrefint itself does not change with VDDA, so its reading falls as VDDA rises: VDDA = 3000 mV × cal ÷ raw."],
    2: ["Pin voltage", "raw ÷ 4095 × VDDA, with VDDA from the line above, in 64-bit integer arithmetic with rounding. The G4 has an FPU, but integer maths keeps the function exact and trivially host-testable."],
    3: ["Mean of one channel", "Walk the interleaved buffer with a stride of 2."],
  });
  Register($("#reg-adccr2"), { reg: "ADC_CR", value: 0x10000001 });
  Pinout($("#po-adc"), { board: "nucleo", mode: "wiring", ...window.MCU_DATA.wiring["05"] });
  Register($("#reg-dmamux"), { reg: "DMAMUX_CxCR", value: 0x00000005 });
  Register($("#reg-dmaccr"), { reg: "DMA_CCR", value: 0x000005a1 });

  SequenceDiagram($("#seq-dma"), {
    ariaLabel: "ADC conversion results moved to SRAM by DMA",
    laneW: 170,
    lanes: [
      { title: "ADC1", sub: "sequence + continuous", tone: "hw" },
      { title: "DMAMUX ch0 → DMA1 ch1", sub: "circular", tone: "tool" },
      { title: "SRAM", sub: "s_buf[64]", tone: "svc" },
      { title: "CPU", sub: "main()", tone: "asw" },
    ],
    steps: [
      { from: 0, to: 1, kind: "dma", label: "request (EOC)", title: "A conversion finishes", detail: "<p>With <code>CFGR.DMAEN</code> set, end of conversion raises the ADC1 DMA request. DMAMUX channel 0 is set to request ID 5 and forwards it to DMA1 channel 1.</p>" },
      { from: 1, to: 0, kind: "bus", label: "read ADC1->DR", title: "DMA reads the result", detail: "<p>The DMA controller takes a bus cycle and reads 16 bits from <code>CPAR</code>. Reading <code>DR</code> clears <code>EOC</code>, just as a CPU read would.</p>" },
      { from: 1, to: 2, kind: "dma", label: "write s_buf[i]", title: "…and stores it", detail: "<p>It writes the half-word to <code>CMAR</code>, then increments the memory address and decrements <code>CNDTR</code>.</p>", analogy: "A conveyor belt that drops each finished part into the next free slot of a rack." },
      { from: 1, to: 1, label: "CNDTR = 0 → reload", title: "Wrap around", detail: "<p>In circular mode the counter and addresses reload automatically. With <code>HTIE</code>/<code>TCIE</code> the channel can also interrupt at the half and at the end.</p>" },
      { from: 3, to: 2, kind: "ret", label: "read + average", title: "The CPU only reads results", detail: "<p>Thousands of conversions per second cost the CPU nothing; it averages the buffer whenever it needs a value.</p>" },
    ],
  });

  Checklist($("#ck-adc"), [
    "You can explain how a SAR ADC finds 12 bits in 12 steps, and why sampling time matters.",
    "You can list the four bring-up steps of the G4 ADC in order. Example 05 prints about 1650 mV with the pot in the middle, and the value follows the knob.",
    "Part 2 prints averaged readings: DMA is running and the CPU only averages.",
    "You can say what DMAMUX does, which request ID ADC1 has, and why a DMA buffer must not live in CCM SRAM.",
  ], { key: "adc-dma" });
})();
