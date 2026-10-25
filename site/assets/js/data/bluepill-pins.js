/* SPDX-License-Identifier: MIT
   =========================================================================
   Blue Pill board data for the pinout engine (MCU.Pinout) and for
   tools/export-wiring.mjs, which draws examples/NN-…/wiring.svg from it.
   Pin functions, LQFP48 numbers and 5 V tolerance: DS5319 Table 5 (pin
   definitions) and RM0008 §9.3 (alternate-function remapping).
   Header order and on-board parts come from community schematics: on most
   boards they match; check yours.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.MCU_DATA = root.MCU_DATA || {}).bluepill = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // af: default alternate functions; remap: functions available after an AFIO_MAPR remap.
  const P = (lqfp, ft, af, extra = {}) => ({ lqfp, ft, af, remap: [], ...extra });
  const pins = {
    PA0: P(10, false, ["WKUP", "USART2_CTS", "ADC12_IN0", "TIM2_CH1_ETR"], { examples: ["01", "03"] }),
    PA1: P(11, false, ["USART2_RTS", "ADC12_IN1", "TIM2_CH2"], { examples: ["05", "capstone"] }),
    PA2: P(12, false, ["USART2_TX", "ADC12_IN2", "TIM2_CH3"]),
    PA3: P(13, false, ["USART2_RX", "ADC12_IN3", "TIM2_CH4"]),
    PA4: P(14, false, ["SPI1_NSS", "USART2_CK", "ADC12_IN4"], { examples: ["07"] }),
    PA5: P(15, false, ["SPI1_SCK", "ADC12_IN5"], { examples: ["07"] }),
    PA6: P(16, false, ["SPI1_MISO", "ADC12_IN6", "TIM3_CH1"], { remap: ["TIM1_BKIN"], examples: ["03", "07"] }),
    PA7: P(17, false, ["SPI1_MOSI", "ADC12_IN7", "TIM3_CH2"], { remap: ["TIM1_CH1N"], examples: ["07"] }),
    PB0: P(18, false, ["ADC12_IN8", "TIM3_CH3"], { remap: ["TIM1_CH2N"] }),
    PB1: P(19, false, ["ADC12_IN9", "TIM3_CH4"], { remap: ["TIM1_CH3N"] }),
    PB2: P(20, true, ["BOOT1"], { notes: "Also the BOOT1 strap, sampled at reset (jumper on most boards)." }),
    PB10: P(21, true, ["I2C2_SCL", "USART3_TX"], { remap: ["TIM2_CH3"] }),
    PB11: P(22, true, ["I2C2_SDA", "USART3_RX"], { remap: ["TIM2_CH4"] }),
    PB12: P(25, true, ["SPI2_NSS", "I2C2_SMBA", "USART3_CK", "TIM1_BKIN"], { examples: ["capstone"] }),
    PB13: P(26, true, ["SPI2_SCK", "USART3_CTS", "TIM1_CH1N"], { examples: ["capstone"] }),
    PB14: P(27, true, ["SPI2_MISO", "USART3_RTS", "TIM1_CH2N"], { examples: ["capstone"] }),
    PB15: P(28, true, ["SPI2_MOSI", "TIM1_CH3N"]),
    PA8: P(29, true, ["USART1_CK", "TIM1_CH1", "MCO"], { notes: "MCO: output an internal clock to measure it." }),
    PA9: P(30, true, ["USART1_TX", "TIM1_CH2"], { notes: "System bootloader TX (AN2606).", examples: ["00", "04", "12"] }),
    PA10: P(31, true, ["USART1_RX", "TIM1_CH3"], { notes: "System bootloader RX (AN2606).", examples: ["00", "04", "12"] }),
    PA11: P(32, true, ["USART1_CTS", "USBDM", "CAN_RX", "TIM1_CH4"], { notes: "USB D− on the micro-USB connector." }),
    PA12: P(33, true, ["USART1_RTS", "USBDP", "CAN_TX", "TIM1_ETR"], { notes: "USB D+ with the R10 pull-up to 3.3 V." }),
    PA13: P(34, true, ["SWDIO"], { remap: ["PA13"], warn: "SWD data. Do not reconfigure it, or the debugger loses the chip." }),
    PA14: P(37, true, ["SWCLK"], { remap: ["PA14"], warn: "SWD clock. Do not reconfigure it." }),
    PA15: P(38, true, ["JTDI"], { remap: ["TIM2_CH1_ETR", "SPI1_NSS", "PA15"], notes: "Free as GPIO only after SWJ_CFG = JTAGDISABLE." }),
    PB3: P(39, true, ["JTDO", "TRACESWO"], { remap: ["TIM2_CH2", "SPI1_SCK", "PB3"], notes: "SWO trace output. Free as GPIO only after SWJ_CFG = JTAGDISABLE." }),
    PB4: P(40, true, ["NJTRST"], { remap: ["TIM3_CH1", "SPI1_MISO", "PB4"], notes: "Free as GPIO only after SWJ_CFG = JTAGDISABLE (or NOJNTRST)." }),
    PB5: P(41, false, ["I2C1_SMBA"], { remap: ["TIM3_CH2", "SPI1_MOSI"] }),
    PB6: P(42, true, ["I2C1_SCL", "TIM4_CH1"], { remap: ["USART1_TX"], examples: ["06"] }),
    PB7: P(43, true, ["I2C1_SDA", "TIM4_CH2"], { remap: ["USART1_RX"], examples: ["06"] }),
    PB8: P(45, true, ["TIM4_CH3"], { remap: ["I2C1_SCL", "CAN_RX"], examples: ["11", "capstone"] }),
    PB9: P(46, true, ["TIM4_CH4"], { remap: ["I2C1_SDA", "CAN_TX"], examples: ["11", "capstone"] }),
    PC13: P(2, false, ["TAMPER-RTC"], { warn: "On-board LED, active-low. Sinks only ~3 mA, ≤ 2 MHz, must not source current (DS5319 Table 5 notes).", examples: ["00", "01", "02"] }),
    PC14: P(3, false, ["OSC32_IN"], { warn: "32.768 kHz crystal on most boards. Same ~3 mA / 2 MHz limits as PC13." }),
    PC15: P(4, false, ["OSC32_OUT"], { warn: "32.768 kHz crystal on most boards. Same ~3 mA / 2 MHz limits as PC13." }),
  };
  const power = {
    "5V": { kind: "power", notes: "From USB (through a diode on most boards) or an external 5 V supply. Never connect two supplies at once." },
    "3V3": { kind: "power", notes: "Regulator output. The ST-Link 3.3 V pin can power the board for flashing." },
    GND: { kind: "ground" },
    VB: { kind: "power", notes: "VBAT: backup domain supply (RTC, backup registers). Tie to 3.3 V if unused." },
    R: { kind: "control", notes: "NRST: pull low to reset. Connect it to the ST-Link RST pin for connect-under-reset." },
  };
  return {
    board: { name: "Blue Pill", mcu: "STM32F103C8T6", package: "LQFP48", source: "DS5319 Table 5; header order from community schematics (on most boards; check yours)" },
    // Viewed from the top, USB connector at the top. Left column top→bottom, right column top→bottom.
    headers: {
      left: ["B12", "B13", "B14", "B15", "A8", "A9", "A10", "A11", "A12", "A15", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "5V", "GND", "3V3"],
      right: ["GND", "GND", "3V3", "R", "B11", "B10", "B1", "B0", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "C15", "C14", "C13", "VB"],
      swd: ["3V3", "SWDIO", "SWCLK", "GND"],
    },
    pins,
    power,
    onboard: [
      { id: "led", pin: "PC13", label: "User LED: 3.3 V → resistor → LED → PC13, so it lights when PC13 is LOW" },
      { id: "pwr-led", label: "Power LED" },
      { id: "hse", pin: "PD0/PD1", label: "8 MHz crystal (HSE) on OSC_IN/OSC_OUT" },
      { id: "lse", pin: "PC14/PC15", label: "32.768 kHz crystal (LSE)" },
      { id: "boot0", label: "BOOT0 jumper: 0 = run from flash, 1 = system bootloader" },
      { id: "boot1", pin: "PB2", label: "BOOT1 jumper (PB2), only matters when BOOT0 = 1" },
      { id: "r10", pin: "PA12", label: "R10 USB D+ pull-up. Often 10 kΩ instead of the 1.5 kΩ USB asks for, on many boards; check yours" },
      { id: "reset", label: "Reset button (NRST)" },
      { id: "usb", label: "Micro-USB: power + USB D−/D+ on PA11/PA12" },
    ],
    // External parts the wiring view can draw next to the board.
    parts: {
      stlink: { title: "ST-Link V2", pins: ["SWDIO", "SWCLK", "GND", "3.3V", "RST"] },
      usbuart: { title: "USB-UART (3.3 V)", pins: ["RX", "TX", "GND"] },
      button: { title: "Push button", pins: ["1", "2"] },
      led: { title: "LED + 330 Ω", pins: ["A", "K"] },
      jumper: { title: "Jumper wire", pins: ["1", "2"] },
      pot: { title: "10 kΩ pot", pins: ["1", "W", "3"] },
      oled: { title: "SSD1306 (I2C)", pins: ["GND", "VCC", "SCL", "SDA"] },
      w25q: { title: "W25Qxx (SPI)", pins: ["CS", "DO", "GND", "VCC", "CLK", "DI"] },
      sn65: { title: "SN65HVD230", pins: ["3V3", "GND", "D", "R", "CANH", "CANL"] },
      // capstone: several buttons and lamps at once
      stalkL: { title: "Left stalk (button)", pins: ["1", "2"] },
      stalkR: { title: "Right stalk (button)", pins: ["1", "2"] },
      hazard: { title: "Hazard (button)", pins: ["1", "2"] },
      lampL: { title: "Left lamp: LED + 330 Ω", pins: ["A", "K"] },
      lampR: { title: "Right lamp: LED + 330 Ω", pins: ["A", "K"] },
    },
  };
});
