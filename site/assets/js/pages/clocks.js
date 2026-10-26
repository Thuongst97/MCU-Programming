/* SPDX-License-Identifier: MIT
   Module 04 · Clocks: RCC, PLL, Boost Mode and Flash Wait States. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, ClockTree, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  const pll = Register($("#reg-pllcfgr-clk"), { reg: "RCC_PLLCFGR" });
  const cfgr = Register($("#reg-cfgr-clk"), { reg: "RCC_CFGR", show: ["SW", "SWS", "HPRE", "PPRE1", "PPRE2"] });
  ClockTree($("#clk-tree"), { register: cfgr, pllRegister: pll });
  Register($("#reg-acr"), { reg: "FLASH_ACR", value: 0x00040704 });
  Register($("#reg-ahb2"), { reg: "RCC_AHB2ENR", value: 0x00002001 });
  Register($("#reg-apb1"), { reg: "RCC_APB1ENR1", value: 0x12000400 });
  Register($("#reg-apb2"), { reg: "RCC_APB2ENR", value: 0x00000001 });
  Register($("#reg-ccipr"), { reg: "RCC_CCIPR", value: 0x02000000 });

  const CLOCK = {
    1: ["Clock the PWR block", "The power controller is an APB1 peripheral like any other: no clock, no register writes."],
    2: ["Range 1, and wait", "<code>VOS = 01</code> is range 1, also the reset value; writing it makes the requirement explicit. <code>VOSF</code> stays set while the regulator is still changing level, so the code waits for it to clear, with a timeout."],
    3: ["Boost mode", "<code>R1MODE = 0</code> selects range 1 boost, required above 150 MHz. The reset value 1 is range 1 normal."],
    4: ["Wait states first", "Four wait states plus prefetch and both caches, set while the core still runs at 16 MHz, where any latency is safe."],
    5: ["Read it back", "The flash interface may take a moment to accept a new latency; reading the value back before going faster is the step RM0440 recommends."],
    6: ["PLL source", "HSI16 feeds the PLL. These fields may only change while <code>PLLON</code> = 0 and <code>PLLRDY</code> reads 0."],
    7: ["PLLM holds M − 1", "÷ 4 is written as 3. The result, 4 MHz, must lie in the PLL's input range (2.66–16 MHz in ST's LL code)."],
    8: ["PLLN holds N", "× 85 gives a 340 MHz VCO, inside its 64–344 MHz range. <code>PLLR = 00</code> divides by 2, and <code>PLLREN</code> enables that output."],
    9: ["AHB ÷ 2 for the jump", "Clear the three prescaler fields and set HPRE to ÷ 2 in one write, so SYSCLK reaches the core at 85 MHz for the first microsecond."],
    10: ["Confirm with SWS", "The switch completes within a few cycles of the new clock; <code>SWS</code> reports it. If it never does, the function returns an error and the chip keeps running on HSI16."],
    11: ["Full speed", "After at least 1 µs at ÷ 2, set HPRE back to ÷ 1: HCLK = 170 MHz."],
    12: ["Update SystemCoreClock", "Recomputes the CMSIS variable from the RCC registers so SysTick and baud rates use the new frequency."],
    13: ["PA8 as alternate function", "MCO is alternate function 0 of PA8 (DS12288), at very high output speed for clean edges."],
    14: ["Select the source", "<code>MCOSEL</code> = 0011 sends HSI16 to the pin; 0001 sends SYSCLK, which the code divides by 16 with <code>MCOPRE</code>."],
  };
  ["boost", "flash", "pll", "switch", "mco"].forEach((r) => explore(`#ex-${r}`, `src-clk-${r}`, CLOCK));

  StateMachine($("#sm-switch"), {
    ariaLabel: "Clock switch sequence from HSI16 to the PLL at 170 MHz",
    initial: "hsi",
    height: 350,
    boxW: 170,
    states: [
      { id: "hsi", label: "HSI16 16 MHz", sub: "after reset", x: 20, y: 20, tone: "hw", desc: "<p>The core runs from the internal RC oscillator, with range 1 normal mode and no flash wait states.</p>" },
      { id: "boost", label: "Boost mode", sub: "R1MODE = 0", x: 280, y: 20, tone: "mcal", desc: "<p>The regulator now allows up to 170 MHz. Nothing has sped up yet.</p>" },
      { id: "ws", label: "Flash ready", sub: "LATENCY = 4", x: 540, y: 20, tone: "mcal", desc: "<p>Flash now tolerates 170 MHz. At 16 MHz the extra wait states only cost a little speed.</p>" },
      { id: "pll", label: "PLL locking", sub: "PLLON = 1", x: 540, y: 150, tone: "tool", desc: "<p>PLL configured to HSI16 ÷ 4 × 85 ÷ 2 and started. Software polls <code>PLLRDY</code>.</p>" },
      { id: "pllrdy", label: "PLL locked", sub: "PLLRDY = 1", x: 280, y: 150, tone: "tool", desc: "<p>170 MHz is available, but SYSCLK still comes from HSI16.</p>" },
      { id: "sw", label: "Switching at ÷ 2", sub: "HPRE = ÷2, SW = PLL", x: 20, y: 150, tone: "tool", desc: "<p>The request is written with the AHB at ÷ 2; the clock multiplexer changes over glitch-free. Software polls <code>SWS</code>.</p>" },
      { id: "half", label: "85 MHz HCLK", sub: "SWS = PLL", x: 20, y: 280, tone: "tool", desc: "<p>SYSCLK is 170 MHz, HCLK 85 MHz. Wait at least 1 µs.</p>" },
      { id: "pllrun", label: "170 MHz", sub: "HPRE = ÷1", x: 280, y: 280, tone: "svc", desc: "<p>Done. Update <code>SystemCoreClock</code>, then (re)start SysTick and every peripheral whose timing depends on a bus clock.</p>" },
      { id: "fail", label: "Timeout", sub: "stay on HSI16", x: 800, y: 150, tone: "cdd", desc: "<p>A ready flag never came. Return an error code, keep running on HSI16 and report it: a working slow system is better than a hung one.</p>" },
    ],
    transitions: [
      { from: "hsi", to: "boost", label: "PWREN, R1MODE = 0" },
      { from: "boost", to: "ws", label: "LATENCY = 4" },
      { from: "ws", to: "pll", label: "PLLCFGR, PLLON" },
      { from: "pll", to: "pllrdy", label: "PLLRDY = 1" },
      { from: "pll", to: "fail", label: "timeout" },
      { from: "pllrdy", to: "sw", label: "HPRE ÷2, SW = PLL" },
      { from: "sw", to: "half", label: "SWS = PLL" },
      { from: "sw", to: "fail", label: "timeout", bend: 55 },
      { from: "half", to: "pllrun", label: "≥ 1 µs, HPRE ÷1" },
      { from: "fail", to: "hsi", label: "report", bend: 0 },
    ],
  });

  Checklist($("#ck-clocks"), [
    "In the clock-tree tool you built the 170 MHz setup from <i>After reset</i> without any red limits, and saw RCC_PLLCFGR = 0x01005532.",
    "You can explain what happens to TIM2's clock when APB1 is set to ÷ 2.",
    "You know the three steps 170 MHz needs before the switch, and the order: boost, wait states, PLL.",
    "With example 04, <code>clock</code> prints 170 MHz three times, and <code>mco hsi</code> shows about 16 MHz on D7 (if you have a scope).",
  ], { key: "clocks" });
})();
