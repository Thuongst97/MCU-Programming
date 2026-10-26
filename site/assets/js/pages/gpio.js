/* SPDX-License-Identifier: MIT
   Module 05 · GPIO and Alternate Functions. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, Waveform, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  explore("#ex-gpio", "src-01-gpio", {
    1: ["Port clock", "<code>gpio_clock_on()</code> sets the port's bit in <code>RCC_AHB2ENR</code> (GPIOCEN for B1 on PC13) and reads it back."],
    2: ["Input mode", "PC13 starts in analog mode like most pins; <code>MODE13 = 00</code> makes it a digital input so <code>IDR</code> shows the button."],
    3: ["Pull-down", "<code>PUPD13 = 10</code>. ST's NUCLEO BSP configures B1 this way and reads pressed = 1. The board also has its own resistors on B1, so the internal one is a belt-and-braces choice, not a requirement."],
  });
  explore("#ex-mode", "src-bsp-mode", {
    1: ["Field position", "Two bits per pin in <code>MODER</code>: pin <i>n</i> occupies bits 2<i>n</i>+1:2<i>n</i>."],
    2: ["Clear, then set", "A read-modify-write that changes only this pin's two bits. Every other pin, including PA13/PA14, keeps its mode."],
  });
  explore("#ex-af", "src-bsp-af", {
    3: ["Which AFR", "<code>AFR[0]</code> (AFRL) covers pins 0–7, <code>AFR[1]</code> (AFRH) pins 8–15, four bits per pin."],
    4: ["Write the AF number", "Clear the pin's 4-bit field and write the AF number from the datasheet table."],
    5: ["Then switch the mode", "Only after the AF number is set does the pin go to alternate-function mode. In the other order, the pin would briefly belong to whatever AF0 is on that pin."],
  });
  Register($("#reg-moder"), { reg: "GPIOx_MODER", port: "GPIOA", value: 0xABFFFFFF, show: ["MODE5", "MODE2", "MODE3", "MODE13", "MODE14", "MODE15"] });
  Register($("#reg-pupdr"), { reg: "GPIOx_PUPDR", port: "GPIOC", value: 0x08000000, show: ["PUPD13"] });
  explore("#ex-toggle", "src-bsp-toggle", {
    1: ["Read ODR, write BSRR", "Reading <code>ODR</code> tells which level the pin is driving. The change itself goes through <code>led_on()</code>/<code>led_off()</code>, which write <code>BSRR</code>: one store, no read-modify-write of the port."],
  });
  Register($("#reg-bsrr"), { reg: "GPIOx_BSRR", value: 0x00000020 });
  Pinout($("#po-gpio"), { board: "nucleo", mode: "electrical", highlight: ["PA1", "PA5", "PC13"] });
  Register($("#reg-afrl"), { reg: "GPIOx_AFRL", port: "GPIOA", value: 0x0000CC00, show: ["AFSEL2", "AFSEL3", "AFSEL5", "AFSEL6", "AFSEL7"] });

  // A bouncing press: 2 ms per cell, the debounced line changes 20 ms (10 cells) after the last edge.
  const raw = "1111110101100100000000000000000000000001101011111111111111111111";
  const settle = (s) => {
    let out = "", stable = s[0], last = s[0], since = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== last) { last = s[i]; since = i; }
      if (last !== stable && i - since >= 10) stable = last;
      out += stable;
    }
    return out;
  };
  Waveform($("#wv-bounce"), {
    title: "Contact bounce on a button pin and the debounced signal",
    signals: [{ name: "pin", wave: raw }, { name: "pressed", wave: settle(raw).replace(/./g, (c) => (c === "0" ? "1" : "0")) }],
    bands: [{ from: 6, to: 14, text: "bounce", cls: "b-crc" }, { from: 14, to: 24, text: "stable 20 ms", cls: "b-ack" }, { from: 39, to: 44, text: "bounce", cls: "b-crc" }, { from: 44, to: 54, text: "stable 20 ms", cls: "b-ack" }],
  });
  explore("#ex-debounce", "src-01-debounce", {
    1: ["Any change restarts the timer", "Every time the sampled level differs from the previous sample, the contact is still moving: remember when, and decide nothing yet."],
    2: ["Stable long enough: accept", "Only when the level has stayed the same for <code>settle_ms</code> (20 ms in example 01) and differs from the accepted state does it count as a press or a release."],
  });
  Checklist($("#ck-gpio"), [
    "You can configure any pin as input with pull-up, push-pull output or alternate function by writing MODER, PUPDR and AFR.",
    "Example 01 runs: each press of B1 toggles LD2 exactly once, and the log shows more raw edges than presses.",
    "You know where to look up whether a pin is 5 V tolerant, and why analog mode changes the answer.",
    "You can find the AF number for a signal in the pinout, and you know why the course never writes PA13/PA14.",
  ], { key: "gpio" });
})();
