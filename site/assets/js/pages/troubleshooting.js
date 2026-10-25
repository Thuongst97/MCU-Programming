/* SPDX-License-Identifier: MIT
   Reference B · Troubleshooting: register views for the SWD lock-out and the LED pin. */
(function () {
  "use strict";
  const { $, Register } = window.MCU;
  Register($("#reg-mapr-ts"), { reg: "AFIO_MAPR", value: 0x04000000, show: ["SWJ_CFG"] });
  Register($("#reg-crh-ts"), { reg: "GPIOx_CRH", port: "GPIOC", value: 0x44844444, show: ["MODE13", "CNF13"] });
})();
