/* SPDX-License-Identifier: MIT
   Module 04 · Clocks: RCC, HSE, PLL and Flash Wait States. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, ClockTree, StateMachine, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  const cfgr = Register($("#reg-cfgr-clk"), { reg: "RCC_CFGR", show: ["SW", "SWS", "HPRE", "PPRE1", "PPRE2", "ADCPRE", "PLLSRC", "PLLXTPRE", "PLLMUL", "USBPRE"] });
  ClockTree($("#clk-tree"), { register: cfgr });
  Register($("#reg-acr"), { reg: "FLASH_ACR", value: 0x00000032 });
  Register($("#reg-apb2"), { reg: "RCC_APB2ENR", value: 0x00004014 });
  Register($("#reg-apb1"), { reg: "RCC_APB1ENR", value: 0x00000000 });

  const CLOCK = {
    1: ["Start the crystal", "<code>HSEON</code> powers the oscillator driver for the 8 MHz crystal on PD0/PD1."],
    2: ["Wait for HSERDY, with a timeout", "A crystal takes up to a few milliseconds to oscillate stably (DS5319). The bounded wait returns a status instead of hanging when the crystal is missing or broken."],
    3: ["Wait states first", "Two wait states and the prefetch buffer, set while the core still runs at 8 MHz, where any value is safe."],
    4: ["AHB ÷ 1", "HCLK = SYSCLK = 72 MHz: core, memories and DMA at full speed."],
    5: ["APB1 ÷ 2", "36 MHz, the APB1 maximum. TIM2–TIM4 get 72 MHz because of the ×2 rule."],
    6: ["PLL source", "HSE, undivided (<code>PLLXTPRE</code> = 0)."],
    7: ["× 9", "8 MHz × 9 = 72 MHz. PLLMUL can only change while <code>PLLON</code> = 0."],
    8: ["Request PLL as SYSCLK", "Clear the two SW bits, then write <code>10</code>."],
    9: ["Confirm with SWS", "The switch completes within a few cycles of the new clock; <code>SWS</code> reports it. Code that skips this check works on hardware but hides problems in a model."],
    10: ["Update SystemCoreClock", "Recomputes the CMSIS variable from the RCC registers so SysTick and baud rates use the new frequency."],
    11: ["PA8 as alternate function", "MCO is an alternate function of PA8: AF push-pull with the fastest edge rate."],
    12: ["Select the source", "<code>MCO</code> = 110 sends the HSE to the pin; 111 sends PLL ÷ 2."],
  };
  ["hse", "flash", "pll", "switch", "mco"].forEach((r) => explore(`#ex-${r}`, `src-clk-${r}`, CLOCK));

  StateMachine($("#sm-switch"), {
    ariaLabel: "Clock switch sequence from HSI to PLL",
    initial: "hsi",
    height: 350,
    boxW: 170,
    states: [
      { id: "hsi", label: "HSI 8 MHz", sub: "after reset", x: 20, y: 20, tone: "hw", desc: "<p>The core runs from the internal RC oscillator. Everything works, just slower and less accurately.</p>" },
      { id: "hse", label: "HSE starting", sub: "HSEON = 1", x: 280, y: 20, tone: "tool", desc: "<p>The crystal oscillator is powered and building up its oscillation. Software polls <code>HSERDY</code>.</p>" },
      { id: "hserdy", label: "HSE ready", sub: "HSERDY = 1", x: 540, y: 20, tone: "tool", desc: "<p>The 8 MHz crystal is stable. Nothing uses it yet.</p>" },
      { id: "ws", label: "Flash ready", sub: "LATENCY = 2", x: 540, y: 150, tone: "mcal", desc: "<p>Flash now tolerates 72 MHz. At 8 MHz the extra wait states only cost a little speed.</p>" },
      { id: "pll", label: "PLL locking", sub: "PLLON = 1", x: 280, y: 150, tone: "tool", desc: "<p>PLL configured to HSE × 9 and started. Software polls <code>PLLRDY</code>.</p>" },
      { id: "pllrdy", label: "PLL locked", sub: "PLLRDY = 1", x: 20, y: 150, tone: "tool", desc: "<p>72 MHz is available, but SYSCLK still comes from HSI.</p>" },
      { id: "sw", label: "Switching", sub: "SW = PLL", x: 20, y: 280, tone: "tool", desc: "<p>The request is written; the clock multiplexer changes over glitch-free. Software polls <code>SWS</code>.</p>" },
      { id: "pllrun", label: "72 MHz", sub: "SWS = PLL", x: 280, y: 280, tone: "svc", desc: "<p>Done. Update <code>SystemCoreClock</code>, then (re)start SysTick and every peripheral whose timing depends on a bus clock.</p>" },
      { id: "fail", label: "Timeout", sub: "stay on HSI", x: 800, y: 150, tone: "cdd", desc: "<p>A ready flag never came. Return an error code, keep running on HSI and report it: a working slow system is better than a hung one.</p>" },
    ],
    transitions: [
      { from: "hsi", to: "hse", label: "set HSEON" },
      { from: "hse", to: "hserdy", label: "HSERDY = 1" },
      { from: "hse", to: "fail", label: "timeout", desc: "No crystal, a broken one, or a clone board without the part fitted." },
      { from: "hserdy", to: "ws", label: "LATENCY = 2" },
      { from: "ws", to: "pll", label: "PLL ×9, PLLON" },
      { from: "pll", to: "pllrdy", label: "PLLRDY = 1" },
      { from: "pll", to: "fail", label: "timeout", bend: 55 },
      { from: "pllrdy", to: "sw", label: "SW = PLL" },
      { from: "sw", to: "pllrun", label: "SWS = PLL" },
      { from: "sw", to: "fail", label: "timeout", bend: 0 },
      { from: "fail", to: "hsi", label: "report", bend: 0 },
    ],
  });

  Checklist($("#ck-clocks"), [
    "In the clock-tree tool you built the 72 MHz setup from <i>After reset</i> without any red limits.",
    "You can explain why TIM2 counts at 72 MHz although APB1 runs at 36 MHz.",
    "You know why <code>FLASH_ACR</code> is written before the switch, and why <code>FLASH_ACR_LATENCY_2</code> is wrong.",
    "With example 04, <code>clock</code> prints 72 MHz / 36 MHz / 72 MHz, and <code>mco hse</code> shows 8 MHz on PA8 (if you have a scope).",
  ], { key: "clocks" });
})();
