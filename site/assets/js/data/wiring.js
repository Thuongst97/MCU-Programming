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
    "05": { title: "Example 05: 10 kΩ potentiometer on PA1", highlight: ["PA1", "PA9", "PA10"],
      wiring: [...SWD, ...UART, { pin: "right:3V3", to: "pot.1", kind: "power" }, { pin: "A1", to: "pot.W" }, { pin: "right:GND", to: "pot.3", kind: "ground" }] },
    "06": { title: "Example 06: SSD1306 OLED on I2C1 (PB6 SCL, PB7 SDA)", highlight: ["PB6", "PB7", "PA9", "PA10"],
      wiring: [...SWD, ...UART, { pin: "left:GND", to: "oled.GND", kind: "ground" }, { pin: "left:3V3", to: "oled.VCC", kind: "power" }, { pin: "B6", to: "oled.SCL" }, { pin: "B7", to: "oled.SDA" }] },
    "07": { title: "Example 07: W25Qxx flash on SPI1 (CS PA4, CLK PA5, DO PA6, DI PA7)", highlight: ["PA4", "PA5", "PA6", "PA7"],
      wiring: [...SWD, ...UART, { pin: "A4", to: "w25q.CS" }, { pin: "A6", to: "w25q.DO" }, { pin: "right:GND", to: "w25q.GND", kind: "ground" },
        { pin: "right:3V3", to: "w25q.VCC", kind: "power" }, { pin: "A5", to: "w25q.CLK" }, { pin: "A7", to: "w25q.DI" }] },
    "08": { title: "Example 08: ST-Link + USB-UART (keys trigger the faults)", highlight: ["PA9", "PA10", "PC13"], wiring: [...SWD, ...UART] },
    "09": { title: "Example 09: wake-up button on PA0", highlight: ["PA0", "PA9", "PA10"],
      wiring: [...SWD, ...UART, { pin: "A0", to: "button.1" }, { pin: "right:GND", to: "button.2", kind: "ground" }] },
    "11": { title: "Example 11 (each node): SN65HVD230 on PB8/PB9; node A also has a button on PA0", highlight: ["PB8", "PB9", "PA0"],
      wiring: [...SWD, ...UART, { pin: "left:3V3", to: "sn65.3V3", kind: "power" }, { pin: "left:GND", to: "sn65.GND", kind: "ground" },
        { pin: "B9", to: "sn65.D" }, { pin: "B8", to: "sn65.R" }, { pin: "A0", to: "button.1" }, { pin: "right:GND", to: "button.2", kind: "ground" }] },
    "03": { title: "Example 03: LED on PA6 (TIM3 CH1), jumper PA6 → PA0 (TIM2 CH1)", highlight: ["PA6", "PA0", "PA9", "PA10"],
      wiring: [...SWD, ...UART, { pin: "A6", to: "led.A" }, { pin: "right:GND", to: "led.K", kind: "ground" }, { pin: "A6", to: "jumper.1" }, { pin: "A0", to: "jumper.2" }] },
  };
});
