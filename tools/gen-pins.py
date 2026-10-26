#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate the NUCLEO-G474RE pin data for the site (CLAUDE.md rule 10a).

  python3 tools/gen-pins.py           # write site/assets/js/data/nucleo-pins.js
  python3 tools/gen-pins.py --check   # CI: fail if the committed file is stale

Sources, all from ST:
  * third_party/stm32_open_pin_data (ST's CubeMX database, BSD-3-Clause): every pin of the
    STM32G474RETx (LQFP64, the NUCLEO's chip) with its LQFP64 position, its alternate functions
    with AF numbers, and its additional (analog) functions; the LQFP100 position of the same pin on
    the STM32G474VETx, which runs the same firmware.
  * The Arduino header map (D0..D15, A0..A5) of ST's STM32duino variant for NUCLEO_G474RE and the
    NUCLEO BSP (stm32g4xx_nucleo.h): A0 PA0, ..., D15 PB8. The header order follows the Arduino
    Uno R3 layout of NUCLEO-64 boards (UM2505); check the silkscreen of your board.
  * Which example uses a pin: the `pins:` front matter of examples/NN-*/README.md.
Notes and warnings are written for the course (OVERLAY below).
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "third_party/stm32_open_pin_data"
OUT = ROOT / "site/assets/js/data/nucleo-pins.js"
MCU64 = DATA / "STM32G474R(B-C-E)Tx.xml"
MCU100 = DATA / "STM32G474V(B-C-E)Tx.xml"
GPIO = DATA / "IP/GPIO-STM32G47x_gpio_v1_0_Modes.xml"

ARDUINO = {
    "D0": "PC5", "D1": "PC4", "D2": "PA10", "D3": "PB3", "D4": "PB5", "D5": "PB4", "D6": "PB10", "D7": "PA8",
    "D8": "PA9", "D9": "PC7", "D10": "PB6", "D11": "PA7", "D12": "PA6", "D13": "PA5", "D14": "PB9", "D15": "PB8",
    "A0": "PA0", "A1": "PA1", "A2": "PA4", "A3": "PB0", "A4": "PC1", "A5": "PC0",
}
# Viewed from the top, ST-LINK USB at the top. Left: CN6 (power) then CN8 (analog). Right: CN5 then CN9.
HEADERS = {
    "left": ["NC", "IOREF", "RESET", "3V3", "5V", "GND", "GND", "VIN", "A0", "A1", "A2", "A3", "A4", "A5"],
    "right": ["D15", "D14", "AVDD", "GND", "D13", "D12", "D11", "D10", "D9", "D8",
              "D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"],
    # Pins the course uses that are only on the Morpho headers (CN7/CN10). Positions are not drawn.
    "morpho": ["PA2", "PA3", "PA11", "PA12", "PA13", "PA14", "PB12", "PB13", "PB14", "PB15", "PC13"],
}
POWER = {
    "3V3": {"kind": "power", "notes": "3.3 V from the board's regulator. Power 3.3 V modules from here."},
    "5V": {"kind": "power", "notes": "5 V rail. Where it comes from (ST-LINK USB or an external supply) depends on the power jumper; see UM2505."},
    "VIN": {"kind": "power", "notes": "External supply input. Check UM2505 for the allowed range before you use it."},
    "IOREF": {"kind": "power", "notes": "I/O reference voltage for shields: 3.3 V on this board."},
    "AVDD": {"kind": "power", "notes": "Analog supply reference (the AREF position of an Arduino header)."},
    "GND": {"kind": "ground"},
    "RESET": {"kind": "control", "notes": "NRST: pull low to reset the STM32. The black B2 button does the same."},
    "NC": {"kind": "control", "notes": "Not connected."},
}
OVERLAY = {
    "PA2": {"notes": "LPUART1_TX to the ST-LINK virtual COM port (not on the Arduino header)."},
    "PA3": {"notes": "LPUART1_RX from the ST-LINK virtual COM port (not on the Arduino header)."},
    "PA5": {"notes": "Drives LD2 (green), active-high: 1 = on. Also SPI1_SCK: never use SPI1 on PA5 with the LED."},
    "PA8": {"notes": "MCO: outputs an internal clock so you can measure it (example 04 `mco`)."},
    "PA9": {"notes": "System bootloader USART1_TX (AN2606)."},
    "PA10": {"notes": "System bootloader USART1_RX (AN2606)."},
    "PA11": {"notes": "FDCAN1_RX (AF9). Needs an external CAN transceiver: the NUCLEO has none."},
    "PA12": {"notes": "FDCAN1_TX (AF9)."},
    "PA13": {"warn": "SWDIO. Never change its MODER/AFR, or the debugger loses the chip until a connect-under-reset."},
    "PA14": {"warn": "SWCLK. Never change its MODER/AFR."},
    "PB3": {"notes": "SWO trace output to the ST-LINK. Leave it alone if you use SWO."},
    "PB8": {"warn": "Also BOOT0, sampled at reset while option bit nSWBOOT0 = 1 (the default): a pull-up here starts ST's bootloader instead of your program (RM0440 boot configuration)."},
    "PC13": {"notes": "B1 (blue USER button). ST's BSP reads it as 1 when pressed; a community board file says the opposite: check yours."},
    "PC14": {"notes": "OSC32_IN: 32.768 kHz crystal (LSE) on most NUCLEO-64 boards; check yours."},
    "PC15": {"notes": "OSC32_OUT: 32.768 kHz crystal (LSE) on most NUCLEO-64 boards; check yours."},
}
CAPSTONE = ["PA1", "PA6", "PA7", "PA8", "PA9", "PA11", "PA12", "PB12", "PB13", "PB14"]


def strip_ns(root):
    for el in root.iter():
        if "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    return root


def pin_name(raw):
    return re.split(r"[-\s/]", raw.strip())[0]


def mcu_pins(path):
    """{pin: (position, [signal names])} for the GPIO pins of one package."""
    out = {}
    for p in strip_ns(ET.parse(path).getroot()).iter("Pin"):
        name = pin_name(p.get("Name"))
        if p.get("Type") != "I/O" or not re.match(r"^P[A-G]\d{1,2}$", name):
            continue
        out[name] = (int(p.get("Position")), [s.get("Name") for s in p.iter("Signal") if s.get("Name") != "GPIO"])
    return out


def af_table():
    afs = {}
    for pin in strip_ns(ET.parse(GPIO).getroot()).iter("GPIO_Pin"):
        sigs = afs.setdefault(pin_name(pin.get("Name")), {})
        for sig in pin.iter("PinSignal"):
            for val in sig.iter("PossibleValue"):
                m = re.match(r"GPIO_AF(\d+)_", val.text or "")
                if m:
                    sigs[sig.get("Name")] = int(m.group(1))
    return afs


def example_users():
    users = {}
    for readme in sorted(ROOT.glob("examples/[0-9][0-9]-*/README.md")):
        m = re.search(r"^pins:\s*\[(.*?)\]", readme.read_text(encoding="utf-8"), re.M)
        for pin in (m.group(1).split(",") if m else []):
            users.setdefault(pin.strip(), []).append(readme.parent.name[:2])
    for pin in CAPSTONE:
        users.setdefault(pin, []).append("capstone")
    return users


def key(pin):
    return (pin[1], int(pin[2:]))


def build():
    p64, p100, afs, users = mcu_pins(MCU64), mcu_pins(MCU100), af_table(), example_users()
    by_pin = {v: k for k, v in ARDUINO.items()}
    pins = {}
    for name in sorted(p64, key=key):
        pos, signals = p64[name]
        af = sorted(((n, s) for s, n in afs.get(name, {}).items()), key=lambda x: (x[0], x[1]))
        with_af = {s for _, s in af}
        extra = sorted(s for s in signals if s not in with_af)
        entry = {"lqfp64": pos, "lqfp100": p100.get(name, (None,))[0], "arduino": by_pin.get(name),
                 "af": [[n, s] for n, s in af], "analog": [s for s in extra if re.match(r"^(ADC|DAC|COMP|OPAMP)", s)],
                 "other": [s for s in extra if not re.match(r"^(ADC|DAC|COMP|OPAMP)", s)]}
        entry.update(OVERLAY.get(name, {}))
        if name in users:
            entry["examples"] = users[name]
        pins[name] = entry
    missing = [p for p in list(ARDUINO.values()) + HEADERS["morpho"] if p not in pins]
    if missing:
        sys.exit(f"gen-pins: not on the LQFP64 package: {missing}")
    return {
        "board": {"name": "NUCLEO-G474RE", "mcu": "STM32G474RET6", "package": "LQFP64",
                  "source": "ST's open pin data (STM32G474RETx, STM32G474VETx); Arduino map from ST's STM32duino variant and NUCLEO BSP; header order per UM2505 (check your board's silkscreen)"},
        "arduino": ARDUINO, "headers": HEADERS, "power": POWER, "pins": pins,
    }


PARTS = """    // External parts the wiring view can draw next to the board (hand-written).
    parts: {
      usbuart: { title: "USB-UART (3.3 V)", pins: ["RX", "TX", "GND"] },
      button: { title: "Push button", pins: ["1", "2"] },
      led: { title: "LED + 330 Ω", pins: ["A", "K"] },
      jumper: { title: "Jumper wire", pins: ["1", "2"] },
      pot: { title: "10 kΩ pot", pins: ["1", "W", "3"] },
      oled: { title: "SSD1306 (I2C)", pins: ["GND", "VCC", "SCL", "SDA"] },
      w25q: { title: "W25Qxx (SPI)", pins: ["CS", "DO", "GND", "VCC", "CLK", "DI"] },
      canfd: { title: "CAN FD transceiver (3.3 V)", pins: ["3V3", "GND", "TXD", "RXD", "CANH", "CANL"] },
      lin: { title: "LIN wire: diode + 1 kΩ to 3V3", pins: ["K", "RX", "3V3"] },
      stalkL: { title: "Left stalk (button)", pins: ["1", "2"] },
      stalkR: { title: "Right stalk (button)", pins: ["1", "2"] },
      hazard: { title: "Hazard (button)", pins: ["1", "2"] },
      lampL: { title: "Left lamp: LED + 330 Ω", pins: ["A", "K"] },
      lampR: { title: "Right lamp: LED + 330 Ω", pins: ["A", "K"] },
    },
"""


def render(d):
    one = lambda v: json.dumps(v, ensure_ascii=False)
    lines = ["{"]
    for k in ("board", "arduino", "headers", "power"):
        lines.append(f"    {k}: {one(d[k])},")
    lines.append("    pins: {")
    lines += [f"      {name}: {one(info)}," for name, info in d["pins"].items()]
    lines.append("    },")
    body = "\n".join(lines) + "\n" + PARTS + "  }"
    return f"""/* SPDX-License-Identifier: MIT
   =========================================================================
   NUCLEO-G474RE board data for the pinout engine (MCU.Pinout) and for
   tools/export-wiring.mjs. GENERATED by tools/gen-pins.py from ST's open pin
   data: do not edit by hand (CLAUDE.md rule 10a). Regenerate with
   python3 tools/gen-pins.py.
   ========================================================================= */
(function (root, factory) {{
  if (typeof module === "object" && module.exports) module.exports = factory();
  else (root.MCU_DATA = root.MCU_DATA || {{}}).nucleo = factory();
}})(typeof self !== "undefined" ? self : this, function () {{
  "use strict";
  return {body.lstrip()};
}});
"""


def main(argv):
    text = render(build())
    if "--check" in argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"gen-pins: {OUT.relative_to(ROOT)} is out of date: run python3 tools/gen-pins.py")
            return 1
        print("gen-pins: up to date")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"gen-pins: wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
