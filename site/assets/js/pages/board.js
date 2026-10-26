/* SPDX-License-Identifier: MIT
   Reference A · NUCLEO-G474RE Board Reference: interactive pinout and the boot option bits. */
(function () {
  "use strict";
  const { $, Pinout, Register } = window.MCU;
  Pinout($("#po-board"), { board: "nucleo", mode: "functions", highlight: ["PA5", "PC13", "PA2", "PA3", "PA13", "PA14", "PB8"] });
  Register($("#reg-optr"), { reg: "FLASH_OPTR", value: 0xFFEFF8AA, show: ["nBOOT0", "nSWBOOT0", "nBOOT1", "DBANK", "RDP"] });
})();
