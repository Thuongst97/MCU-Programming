#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Check alternate-function numbers against ST's open pin data (CLAUDE.md rules 10a and 19).

Firmware names every AF number as a constant `AF_<pin>_<signal>`, for example
    #define AF_PA2_LPUART1_TX 12U
This tool finds every such #define in examples/, autosar/ and capstone/ and checks, against
third_party/stm32_open_pin_data (ST's CubeMX database, BSD-3-Clause):
  * the pin exists on the NUCLEO-G474RE's package (LQFP64, STM32G474RETx)
  * the pin offers that signal as an alternate function, with that AF number

Usage:
  python3 tools/check-pins.py                 # check the firmware
  python3 tools/check-pins.py --lookup PA6    # list a pin's AF signals (authoring aid)
  python3 tools/check-pins.py --signal FDCAN1 # list the pins that carry a signal
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "third_party/stm32_open_pin_data"
MCU_XML = DATA / "STM32G474R(B-C-E)Tx.xml"
GPIO_XML = DATA / "IP/GPIO-STM32G47x_gpio_v1_0_Modes.xml"
SCAN = ["examples", "autosar", "capstone"]
AF_DEF = re.compile(r"^\s*#\s*define\s+AF_(P[A-G]\d{1,2})_(\w+)\s+\(?(\d+)U?\)?", re.M)


def strip_ns(root):
    for el in root.iter():
        if "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    return root


def load():
    """Return (package pins, {pin: {signal: af}})."""
    mcu = strip_ns(ET.parse(MCU_XML).getroot())
    package = {p.get("Name").split("-")[0].strip() for p in mcu.iter("Pin")}
    gpio = strip_ns(ET.parse(GPIO_XML).getroot())
    afs = {}
    for pin in gpio.iter("GPIO_Pin"):
        name = pin.get("Name").split("-")[0].strip()
        sigs = afs.setdefault(name, {})
        for sig in pin.iter("PinSignal"):
            for val in sig.iter("PossibleValue"):
                m = re.match(r"GPIO_AF(\d+)_", val.text or "")
                if m:
                    sigs[sig.get("Name")] = int(m.group(1))
    return package, afs


def main(argv):
    package, afs = load()
    if "--lookup" in argv:
        pin = argv[argv.index("--lookup") + 1]
        for sig, af in sorted(afs.get(pin, {}).items(), key=lambda x: x[1]):
            print(f"{pin:5} AF{af:<2} {sig}")
        print(f"{pin} is {'on' if pin in package else 'NOT on'} the LQFP64 package")
        return 0
    if "--signal" in argv:
        want = argv[argv.index("--signal") + 1]
        for pin in sorted(afs, key=lambda p: (p[1], int(p[2:]))):
            for sig, af in afs[pin].items():
                if sig.startswith(want) and pin in package:
                    print(f"{pin:5} AF{af:<2} {sig}")
        return 0
    errors, checked = [], 0
    for base in SCAN:
        for f in sorted((ROOT / base).rglob("*.[ch]")):
            if "/hal/Drivers/" in f.as_posix():
                continue
            for pin, sig, af in AF_DEF.findall(f.read_text(encoding="utf-8", errors="replace")):
                checked += 1
                where = f.relative_to(ROOT)
                if pin not in package:
                    errors.append(f"{where}: {pin} is not on the LQFP64 package")
                elif sig not in afs.get(pin, {}):
                    errors.append(f"{where}: {pin} has no alternate function {sig}")
                elif afs[pin][sig] != int(af):
                    errors.append(f"{where}: AF_{pin}_{sig} is {af}, ST's pin data says {afs[pin][sig]}")
    for e in errors:
        print(f"check-pins: {e}")
    print(f"check-pins: {checked} AF constant(s) checked against ST's pin data, {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
