/* SPDX-License-Identifier: MIT
   Module 05 · GPIO and Alternate Functions. */
(function () {
  "use strict";
  const { $, renderCodeExplorer, embedded, Register, Pinout, Waveform, Checklist } = window.MCU;
  const explore = (host, id, notes) => renderCodeExplorer($(host), { ...embedded(id), notes });

  explore("#ex-gpio", "src-01-gpio", {
    1: ["Two clocks", "GPIOA for the pin, AFIO because example 01 also routes PA0 to an EXTI line."],
    2: ["Input with pull", "<code>MODE0 = 00</code> (input) and <code>CNF0 = 10</code> (pull-up/pull-down). Which of the two depends on ODR …"],
    3: ["… so set ODR0 = 1", "With ODR0 = 1 the internal resistor pulls PA0 up to 3.3 V. The button connects PA0 to GND, so pressed reads 0, released reads 1."],
  });
  Register($("#reg-crl"), { reg: "GPIOx_CRL", port: "GPIOA", value: 0x44444444, show: ["MODE0", "CNF0", "MODE1", "CNF1", "MODE6", "CNF6", "MODE7", "CNF7"] });
  explore("#ex-toggle", "src-bsp-toggle", {
    1: ["Read ODR, write BSRR", "Reading <code>ODR</code> tells which level the pin is driving. The change itself goes through <code>led_on()</code>/<code>led_off()</code>, which write <code>BSRR</code>: one store, no read-modify-write of the port."],
  });
  Register($("#reg-bsrr"), { reg: "GPIOx_BSRR", value: 0x20000000 });
  Pinout($("#po-gpio"), { board: "bluepill", mode: "electrical", highlight: ["PA0", "PA6", "PC13"] });
  Register($("#reg-mapr-gpio"), { reg: "AFIO_MAPR", value: 0x02004000, show: ["SWJ_CFG", "CAN_REMAP", "TIM3_REMAP", "TIM2_REMAP", "USART1_REMAP", "I2C1_REMAP", "SPI1_REMAP"] });

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
    title: "Contact bounce on PA0 and the debounced signal",
    signals: [{ name: "PA0", wave: raw }, { name: "pressed", wave: settle(raw).replace(/./g, (c) => (c === "0" ? "1" : "0")) }],
    bands: [{ from: 6, to: 14, text: "bounce", cls: "b-crc" }, { from: 14, to: 24, text: "stable 20 ms", cls: "b-ack" }, { from: 39, to: 44, text: "bounce", cls: "b-crc" }, { from: 44, to: 54, text: "stable 20 ms", cls: "b-ack" }],
  });
  explore("#ex-debounce", "src-01-debounce", {
    1: ["Any change restarts the timer", "Every time the sampled level differs from the previous sample, the contact is still moving: remember when, and decide nothing yet."],
    2: ["Stable long enough: accept", "Only when the level has stayed the same for <code>settle_ms</code> (20 ms in example 01) and differs from the accepted state does it count as a press or a release."],
  });
  Checklist($("#ck-gpio"), [
    "You can configure any pin as input with pull-up, push-pull output or AF output by writing CRL/CRH.",
    "Example 01 runs: each press toggles the LED exactly once, and you saw more raw edges than presses on hardware.",
    "You know which Blue Pill pins are 5 V tolerant and which are not.",
    "You can free PA15 for GPIO without losing SWD, and you know why <code>SWJ_CFG</code> must be written explicitly.",
  ], { key: "gpio" });
})();
