/* SPDX-License-Identifier: MIT
   =========================================================================
   Wiring of every example, in one place. Pages draw it with
   MCU.Pinout(host, { mode: "wiring", ...MCU_DATA.wiring["00"] }) and
   tools/export-wiring.mjs writes examples/NN-…/wiring.svg from the same data.
   pin: Arduino label ("D8", "A1"), Morpho pin name ("PA11"), power label ("3V3"),
   or "left:GND" / "right:GND" when the name exists more than once;
   to: "<part>.<pin>" from nucleo-pins.js parts.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.MCU_DATA = root.MCU_DATA || {}).wiring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // Power, SWD and the virtual COM port reach the board over the one ST-LINK USB cable: no wires.
  const BTN = [{ pin: "A0", to: "button.1" }, { pin: "left:GND", to: "button.2", kind: "ground" }];
  const CAN = [{ pin: "left:3V3", to: "canfd.3V3", kind: "power" }, { pin: "left:GND", to: "canfd.GND", kind: "ground" },
    { pin: "PA12", to: "canfd.TXD" }, { pin: "PA11", to: "canfd.RXD" }];
  const OLED = [{ pin: "right:GND", to: "oled.GND", kind: "ground" }, { pin: "left:3V3", to: "oled.VCC", kind: "power" },
    { pin: "D8", to: "oled.SCL" }, { pin: "D7", to: "oled.SDA" }];
  return {
    "00": { title: "Example 00: nothing to wire (USB cable to the ST-LINK)", highlight: ["PA5", "PA2", "PA3"], wiring: [] },
    "01": { title: "Example 01: B1 (PC13) and LD2 (PA5) are on the board", highlight: ["PC13", "PA5", "PA2", "PA3"], wiring: [] },
    "02": { title: "Example 02: nothing to wire", highlight: ["PA5", "PA2", "PA3"], wiring: [] },
    "03": { title: "Example 03: LED on D12 (PA6, TIM3 CH1), jumper D12 → A0 (PA0, TIM2 CH1)", highlight: ["PA6", "PA0"],
      wiring: [{ pin: "D12", to: "led.A" }, { pin: "right:GND", to: "led.K", kind: "ground" }, { pin: "D12", to: "jumper.1" }, { pin: "A0", to: "jumper.2" }] },
    "04": { title: "Example 04: nothing to wire (type into the shell); MCO on D7 (PA8)", highlight: ["PA2", "PA3", "PA8"], wiring: [] },
    "05": { title: "Example 05: 10 kΩ potentiometer on A1 (PA1)", highlight: ["PA1"],
      wiring: [{ pin: "left:3V3", to: "pot.1", kind: "power" }, { pin: "A1", to: "pot.W" }, { pin: "left:GND", to: "pot.3", kind: "ground" }] },
    "06": { title: "Example 06: SSD1306 OLED on I2C2 (D8 = PA9 SCL, D7 = PA8 SDA)", highlight: ["PA9", "PA8"], wiring: OLED },
    "07": { title: "Example 07: W25Qxx flash on SPI2 (CS PB12, CLK PB13, DO PB14, DI PB15; Morpho)", highlight: ["PB12", "PB13", "PB14", "PB15"],
      wiring: [{ pin: "PB12", to: "w25q.CS" }, { pin: "PB14", to: "w25q.DO" }, { pin: "right:GND", to: "w25q.GND", kind: "ground" },
        { pin: "left:3V3", to: "w25q.VCC", kind: "power" }, { pin: "PB13", to: "w25q.CLK" }, { pin: "PB15", to: "w25q.DI" }] },
    "08": { title: "Example 08: nothing to wire (keys in the terminal trigger the faults)", highlight: ["PA2", "PA3", "PA5"], wiring: [] },
    "09": { title: "Example 09: B1 (PC13) wakes the chip from Stop", highlight: ["PC13", "PA5"], wiring: [] },
    "10": { title: "Example 10: B1 (PC13) → EXTI → semaphore", highlight: ["PC13", "PA5"], wiring: [] },
    "11": { title: "Example 11 (each node): CAN FD transceiver on PA12 (TX) / PA11 (RX)", highlight: ["PA11", "PA12", "PC13"], wiring: CAN },
    "12": { title: "Example 12: updates over the virtual COM port; hold B1 at reset to stay in the bootloader", highlight: ["PC13", "PA2", "PA3"], wiring: [] },
    "13": { title: "Example 13 (each node): LIN at logic level, USART1 TX on D8 (PA9, through a diode), RX on D2 (PA10)", highlight: ["PA9", "PA10"],
      wiring: [{ pin: "D8", to: "lin.K" }, { pin: "D2", to: "lin.RX" }, { pin: "left:3V3", to: "lin.3V3", kind: "power" }] },
    "tl-ecu": { title: "TurnLight ECU node: stalk and hazard buttons, two PWM lamps, current pot, CAN FD transceiver",
      highlight: ["PB12", "PB13", "PB14", "PA6", "PA7", "PA1", "PA11", "PA12"],
      wiring: [{ pin: "PB12", to: "stalkL.1" }, { pin: "PB13", to: "stalkR.1" }, { pin: "PB14", to: "hazard.1" },
        { pin: "right:GND", to: "stalkL.2", kind: "ground" }, { pin: "right:GND", to: "stalkR.2", kind: "ground" }, { pin: "right:GND", to: "hazard.2", kind: "ground" },
        { pin: "D12", to: "lampL.A" }, { pin: "D11", to: "lampR.A" }, { pin: "right:GND", to: "lampL.K", kind: "ground" }, { pin: "right:GND", to: "lampR.K", kind: "ground" },
        { pin: "left:3V3", to: "pot.1", kind: "power" }, { pin: "A1", to: "pot.W" }, { pin: "left:GND", to: "pot.3", kind: "ground" }, ...CAN] },
    "tl-cluster": { title: "TurnLight cluster node: SSD1306 OLED on I2C2, CAN FD transceiver; B1 mutes the acknowledgements",
      highlight: ["PA9", "PA8", "PA11", "PA12", "PC13"], wiring: [...OLED, ...CAN] },
  };
});
