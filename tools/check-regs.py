#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify hand-authored register data against ST's CMSIS device header (PLAN.md §2.4, CLAUDE.md rule 10a).

The register viewer's data (site/assets/js/data/regs-stm32f103.js) is written by hand from RM0008,
because the SVD's licence is unclear. This tool makes sure that hand-written data can never drift
from the Apache-2.0 header third_party/cmsis_device_f1/Include/stm32f103xb.h:

  * the register address equals <PERIPH>_BASE + offsetof(<PERIPH>_TypeDef, <REG>)
  * every field's bit range equals <PERIPH>_<REG>_<FIELD>_Pos / _Msk

Data format (window.MCU_DATA.regs):
  RCC_CFGR: { periph: "RCC", reg: "CFGR", addr: 0x40021004, ref: "RM0008 §7.3.2",
              fields: [ { name: "PLLMUL", cmsis: "PLLMULL", bits: [21, 18] }, … ] }
  GPIOx_CRH: { periph: "GPIOC", typedef: "GPIO", reg: "CRH", macro: "GPIO_CRH", addr: …, fields: […] }
  ("cmsis" overrides the field name used in the header; "macro" overrides the <PERIPH>_<REG> prefix.)

Usage:
  python3 tools/check-regs.py              # check the data file (if it exists) + header self-test
  python3 tools/check-regs.py --selftest   # only the header self-test
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEADER = ROOT / "third_party/cmsis_device_f1/Include/stm32f103xb.h"
DATA = ROOT / "site/assets/js/data/regs-stm32f103.js"
SIZES = {"uint32_t": 4, "uint16_t": 2, "uint8_t": 1}


class Header:
    def __init__(self, text):
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        self.defines = dict(re.findall(r"^\s*#define\s+(\w+)\s+(.+?)\s*$", text, re.M))
        self.structs = {}
        for body, name in re.findall(r"typedef\s+struct\s*\{(.*?)\}\s*(\w+)_TypeDef\s*;", text, re.S):
            off, members = 0, {}
            for typ, mname, arr in re.findall(r"(?:__IO|__I|__O|volatile|const|\s)*\b(uint32_t|uint16_t|uint8_t)\s+(\w+)\s*(?:\[\s*(\w+)\s*\])?\s*;", body):
                n = int(self.value(arr)) if arr else 1
                members[mname] = off
                off += SIZES[typ] * n
            self.structs[name] = members

    def value(self, expr, depth=0):
        """Evaluate a #define expression made of numbers, other defines, + - << | ~ and casts."""
        if depth > 40:
            raise ValueError(f"define recursion: {expr}")
        expr = str(expr)
        if expr in self.defines:
            return self.value(self.defines[expr], depth + 1)
        e = re.sub(r"\(\s*uint32_t\s*\)", "", expr)
        e = re.sub(r"\b(0x[0-9A-Fa-f]+|\d+)[uUlL]+\b", r"\1", e)
        e = re.sub(r"\b([A-Za-z_]\w*)\b", lambda m: str(self.value(m.group(1), depth + 1)) if m.group(1) in self.defines else m.group(1), e)
        if re.search(r"[A-Za-z_]", re.sub(r"0x[0-9A-Fa-f]+", "", e)):
            raise ValueError(f"cannot evaluate '{expr}' -> '{e}'")
        return int(eval(e, {"__builtins__": {}}, {})) & 0xFFFFFFFF  # numbers and operators only (checked above)

    def addr(self, periph, typedef, reg):
        base = self.value(f"{periph}_BASE")
        members = self.structs.get(typedef)
        if members is None or reg not in members:
            raise KeyError(f"{typedef}_TypeDef has no member {reg}")
        return base + members[reg]

    def field(self, prefix, name):
        pos = self.value(f"{prefix}_{name}_Pos")
        msk = self.value(f"{prefix}_{name}_Msk")
        width = bin(msk >> pos).count("1")
        return pos + width - 1, pos


def selftest(h):
    """Facts from RM0008 that the parser must reproduce from the header."""
    cases = [
        (h.addr("RCC", "RCC", "CFGR"), 0x40021004, "RCC_CFGR address"),
        (h.addr("RCC", "RCC", "APB2ENR"), 0x40021018, "RCC_APB2ENR address"),
        (h.addr("GPIOC", "GPIO", "CRH"), 0x40011004, "GPIOC_CRH address"),
        (h.addr("FLASH_R", "FLASH", "ACR"), 0x40022000, "FLASH_ACR address"),
        (h.addr("CAN1", "CAN", "BTR"), 0x4000641C, "CAN_BTR address"),
        (h.addr("AFIO", "AFIO", "MAPR"), 0x40010004, "AFIO_MAPR address"),
        (h.field("RCC_CFGR", "SW"), (1, 0), "RCC_CFGR.SW bits"),
        (h.field("RCC_CFGR", "PLLMULL"), (21, 18), "RCC_CFGR.PLLMUL bits"),
        (h.field("FLASH_ACR", "LATENCY"), (2, 0), "FLASH_ACR.LATENCY bits"),
        (h.field("CAN_BTR", "TS1"), (19, 16), "CAN_BTR.TS1 bits"),
        (h.field("AFIO_MAPR", "SWJ_CFG"), (26, 24), "AFIO_MAPR.SWJ_CFG bits"),
        (h.value("FLASH_ACR_LATENCY_2"), 0x4, "FLASH_ACR_LATENCY_2 is the mask 0x4, not 2 wait states"),
    ]
    bad = [f"self-test {name}: got {got!r}, expected {exp!r}" for got, exp, name in cases if got != exp]
    return bad, len(cases)


def load_data():
    js = ("global.window = { MCU_DATA: {} };"
          f"require({json.dumps(str(DATA))});"
          "process.stdout.write(JSON.stringify(window.MCU_DATA.regs || {}));")
    out = subprocess.run(["node", "-e", js], check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def check_data(h, regs):
    bad = []
    for key, r in regs.items():
        periph, reg = r.get("periph"), r.get("reg")
        typedef = r.get("typedef", re.sub(r"\d+$", "", periph or ""))
        if typedef == "FLASH_R":
            typedef = "FLASH"
        try:
            if r.get("pseudo"):
                continue
            want = h.addr(periph, typedef, reg)
            if r.get("addr") != want:
                bad.append(f"{key}: addr 0x{r.get('addr', 0):08X} != header 0x{want:08X}")
            prefix = r.get("macro", f"{typedef}_{reg}")
            for f in r.get("fields", []):
                hi_lo = h.field(prefix, f.get("cmsis", f["name"]))
                if tuple(f["bits"]) != hi_lo:
                    bad.append(f"{key}.{f['name']}: bits {f['bits']} != header {list(hi_lo)}")
        except (KeyError, ValueError) as e:
            bad.append(f"{key}: {e}")
    return bad


def main():
    h = Header(HEADER.read_text(encoding="utf-8"))
    errors, n = selftest(h)
    checked = 0
    if "--selftest" not in sys.argv and DATA.is_file():
        regs = load_data()
        errors += check_data(h, regs)
        checked = len(regs)
    for e in errors:
        print("ERROR", e)
    note = f"{checked} register(s) checked" if DATA.is_file() else "no register data yet (site/assets/js/data/regs-stm32f103.js arrives in Phase 2)"
    print(f"check-regs: header self-test {n - len([e for e in errors if e.startswith('self-test')])}/{n} ok, {note}, {len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
