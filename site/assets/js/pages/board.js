/* SPDX-License-Identifier: MIT
   Reference A · Blue Pill Board Reference: interactive pinout and the SWJ_CFG register view. */
(function () {
  "use strict";
  const { $, Pinout, Register } = window.MCU;
  Pinout($("#po-board"), { board: "bluepill", mode: "functions", highlight: ["PA13", "PA14", "PC13", "PA9", "PA10"] });
  Register($("#reg-mapr"), { reg: "AFIO_MAPR", value: 0x02000000, show: ["SWJ_CFG", "CAN_REMAP", "USART1_REMAP", "I2C1_REMAP"] });
})();
