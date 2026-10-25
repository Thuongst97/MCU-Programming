/* SPDX-License-Identifier: MIT
   =========================================================================
   Wiring of every example, in one place. Pages draw it with
   MCU.Pinout(host, { mode: "wiring", ...MCU_DATA.wiring["00"] }) and
   tools/export-wiring.mjs writes examples/NN-…/wiring.svg from the same data.
   pin: header label ("A9"), or "swd:GND" / "left:GND" / "right:GND" when the
   name exists more than once; to: "<part>.<pin>" from bluepill-pins.js parts.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.MCU_DATA = root.MCU_DATA || {}).wiring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const SWD = [
    { pin: "swd:SWDIO", to: "stlink.SWDIO", kind: "swd" },
    { pin: "swd:SWCLK", to: "stlink.SWCLK", kind: "swd" },
    { pin: "swd:GND", to: "stlink.GND", kind: "ground" },
    { pin: "swd:3V3", to: "stlink.3.3V", kind: "power" },
  ];
  const UART = [
    { pin: "A9", to: "usbuart.RX" },
    { pin: "A10", to: "usbuart.TX" },
    { pin: "left:GND", to: "usbuart.GND", kind: "ground" },
  ];
  return {
    "00": { title: "Example 00: ST-Link on SWD, USB-UART on USART1", highlight: ["PA9", "PA10", "PC13"], wiring: [...SWD, ...UART] },
    "01": { title: "Example 01: button on PA0 to GND", highlight: ["PA0", "PA9", "PA10", "PC13"],
      wiring: [...SWD, ...UART, { pin: "A0", to: "button.1" }, { pin: "right:GND", to: "button.2", kind: "ground" }] },
    "02": { title: "Example 02: ST-Link + USB-UART only", highlight: ["PA9", "PA10", "PC13"], wiring: [...SWD, ...UART] },
    "04": { title: "Example 04: ST-Link + USB-UART (type into the shell)", highlight: ["PA9", "PA10", "PC13"], wiring: [...SWD, ...UART] },
    "03": { title: "Example 03: LED on PA6 (TIM3 CH1), jumper PA6 → PA0 (TIM2 CH1)", highlight: ["PA6", "PA0", "PA9", "PA10"],
      wiring: [...SWD, ...UART, { pin: "A6", to: "led.A" }, { pin: "right:GND", to: "led.K", kind: "ground" }, { pin: "A6", to: "jumper.1" }, { pin: "A0", to: "jumper.2" }] },
  };
});
