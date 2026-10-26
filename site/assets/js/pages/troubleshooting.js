/* SPDX-License-Identifier: MIT
   Reference B · Troubleshooting: register views for the SWD pins and the LED pin. */
(function () {
  "use strict";
  const { $, Register } = window.MCU;
  Register($("#reg-moder-ts"), { reg: "GPIOx_MODER", port: "GPIOA", value: 0xABFFFFFF, show: ["MODE13", "MODE14", "MODE15"] });
  Register($("#reg-moder5-ts"), { reg: "GPIOx_MODER", port: "GPIOA", value: 0xABFFF7FF, show: ["MODE5"] });
})();
