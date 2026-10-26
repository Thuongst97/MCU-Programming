/* SPDX-License-Identifier: MIT
   Appendix C · From the STM32G474 to Automotive-Grade MCUs. */
(function () {
  "use strict";
  const { $, Checklist } = window.MCU;
  const MAP = {
    "05 GPIO": ["GPIOx MODER/AFR, BSRR", "PORT (pin mux) + GPIO", "PORT (Pn_IOCR), OMR", "PORT, PMC/PM registers"],
    "04 Clocks": ["RCC, HSI16, PLL to 170 MHz, boost mode", "SCG: SOSC, SPLL", "CCU, PLLs, clock monitors", "clock controller, PLL, clock monitors"],
    "06 Interrupts": ["NVIC, 16 levels", "NVIC (Cortex-M)", "interrupt router (IR), service request nodes", "INTC1/INTC2, priority levels"],
    "07 Timers": ["TIM1–TIM8, TIM15–17, TIM20, HRTIM", "FTM, LPIT", "GTM, GPT12, CCU6, STM", "TAUD, TAUJ, OSTM"],
    "08 UART": ["LPUART1, USART1–3, UART4/5", "LPUART", "ASCLIN", "RLIN3 (UART mode)"],
    "09 ADC + DMA": ["ADC1–5, DMA1/2 + DMAMUX", "ADC (SAR), eDMA", "EVADC, EDSADC, DMA", "ADCA, DMA"],
    "10 I2C": ["I2C1–4", "LPI2C", "I2C", "RIIC"],
    "11 SPI": ["SPI1–4", "LPSPI", "QSPI", "CSIH"],
    "12 CAN & LIN": ["FDCAN1–3 (CAN FD), USART LIN mode", "FlexCAN (CAN FD), LPUART LIN", "MCMCAN (CAN FD), ASCLIN LIN", "RS-CANFD, RLIN3"],
    "13 Watchdogs": ["IWDG, WWDG", "WDOG, EWM", "CPU and safety watchdogs, SMU", "WDTA"],
    "16 Bootloader": ["system bootloader, own bootloader", "flash controller, boot header", "boot mode headers, flash controller", "flash library, boot modes"],
    "20 MCAL": ["course autosar/mcal", "NXP Real-Time Drivers (RTD)", "Infineon AURIX MCAL", "Renesas RH850 MCAL"],
  };
  const host = $("#am-map");
  host.innerHTML = `<div class="calc-title"><b>Course module → automotive families</b></div>
    <div class="calc-inputs"><label for="am-mod">Module <select id="am-mod">${Object.keys(MAP).map((k) => `<option>${k}</option>`).join("")}</select></label></div>
    <div class="calc-out" aria-live="polite"></div>`;
  const show = () => {
    const [f1, s32, aurix, rh] = MAP[$("#am-mod").value];
    $(".calc-out", host).innerHTML = `<table class="t"><thead><tr><th>NUCLEO (STM32G474)</th><th>NXP S32K1</th><th>Infineon AURIX TC3xx</th><th>Renesas RH850</th></tr></thead>
      <tbody><tr><td>${f1}</td><td>${s32}</td><td>${aurix}</td><td>${rh}</td></tr></tbody></table>`;
  };
  $("#am-mod").addEventListener("change", show);
  show();
  Checklist($("#ck-am"), [
    "You can name three things an automotive MCU has that the STM32G474 does not.",
    "You can find, for one course module, the matching peripheral in the reference manual of one automotive family.",
    "You know what a vendor MCAL is and which modules it contains.",
  ], { key: "automotive-mcus" });
})();
