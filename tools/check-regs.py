#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify hand-authored register data against ST's CMSIS device header (PLAN.md §2.4, CLAUDE.md rule 10a).

The register viewer's data (site/assets/js/data/regs-stm32g474.js) is written by hand from RM0440,
because the SVD's licence is unclear. This tool makes sure that hand-written data can never drift
from the Apache-2.0 header third_party/cmsis_device_g4/Include/stm32g474xx.h (and core_cm4.h):

  * the register address equals <PERIPH>_BASE + offsetof(<PERIPH>_TypeDef, <REG>) (+ 4 × regIndex
    for array members such as SYSCFG->EXTICR[3]); every addrOf entry is checked the same way
  * every field's bit range equals <PERIPH>_<REG>_<FIELD>_Pos / _Msk (for a split field such as
    TIM_CCMR1_OC1M, the contiguous part that starts at _Pos)

Data format (window.MCU_DATA.regs):
  RCC_CFGR: { periph: "RCC", reg: "CFGR", addr: 0x40021008, ref: "RM0440, RCC",
              fields: [ { name: "SW", bits: [1, 0] }, … ] }
  GPIOx_AFRH: { periph: "GPIOA", typedef: "GPIO", reg: "AFR", regIndex: 1, macro: "GPIO_AFRH", addr: …, fields: […] }
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
HEADER = ROOT / "third_party/cmsis_device_g4/Include/stm32g474xx.h"
CORE_HEADER = ROOT / "third_party/cmsis_core/Include/core_cm4.h"   # SCB, SysTick, NVIC
DATA = ROOT / "site/assets/js/data/regs-stm32g474.js"
SIZES = {"uint32_t": 4, "uint16_t": 2, "uint8_t": 1}


class Header:
    def __init__(self, text):
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        self.defines = dict(re.findall(r"^[ \t]*#[ \t]*define[ \t]+(\w+)[ \t]+(.+?)[ \t]*$", text, re.M))
        self.structs = {}
        for body, name in re.findall(r"typedef\s+struct\s*\{([^{}]*?)}\s*(\w+?)_?Type(?:Def)?\s*;", text, re.S):
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
        msk = self.value(f"{prefix}_{name}_Msk") >> pos
        width = 0
        while msk & 1:           # contiguous run from _Pos (split fields: the low part)
            width += 1
            msk >>= 1
        return pos + width - 1, pos


def selftest(h):
    """Facts from RM0440 that the parser must reproduce from the header."""
    cases = [
        (h.addr("RCC", "RCC", "CFGR"), 0x40021008, "RCC_CFGR address"),
        (h.addr("RCC", "RCC", "AHB2ENR"), 0x4002104C, "RCC_AHB2ENR address"),
        (h.addr("GPIOA", "GPIO", "MODER"), 0x48000000, "GPIOA_MODER address"),
        (h.addr("FLASH_R", "FLASH", "ACR"), 0x40022000, "FLASH_ACR address"),
        (h.addr("PWR", "PWR", "CR5"), 0x40007080, "PWR_CR5 address"),
        (h.addr("FDCAN1", "FDCAN_Global", "NBTP"), 0x4000641C, "FDCAN1_NBTP address"),
        (h.field("RCC_CFGR", "SW"), (1, 0), "RCC_CFGR.SW bits"),
        (h.field("RCC_PLLCFGR", "PLLN"), (14, 8), "RCC_PLLCFGR.PLLN bits"),
        (h.field("FLASH_ACR", "LATENCY"), (3, 0), "FLASH_ACR.LATENCY bits"),
        (h.field("TIM_CCMR1", "OC1M"), (6, 4), "TIM_CCMR1.OC1M low part"),
        (h.value("FLASH_ACR_LATENCY_4WS"), 0x4, "FLASH_ACR_LATENCY_4WS is the value 4"),
        (h.value("RCC_CFGR_SW_PLL"), 0x3, "RCC_CFGR_SW_PLL"),
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
            idx = 4 * r.get("regIndex", 0)
            want = h.addr(periph, typedef, reg) + idx
            if r.get("addr") != want:
                bad.append(f"{key}: addr 0x{r.get('addr', 0):08X} != header 0x{want:08X}")
            for port, a in (r.get("addrOf") or {}).items():
                if a != h.addr(port, typedef, reg) + idx:
                    bad.append(f"{key}: addrOf {port} 0x{a:08X} != header 0x{h.addr(port, typedef, reg) + idx:08X}")
            prefix = r.get("macro", f"{typedef}_{reg}")
            for f in r.get("fields", []):
                if f.get("reserved"):
                    continue
                hi_lo = h.field(prefix, f.get("cmsis", f["name"]))
                if tuple(f["bits"]) != hi_lo:
                    bad.append(f"{key}.{f['name']}: bits {f['bits']} != header {list(hi_lo)}")
                # every named value macro the viewer prints must expand to (value << field position)
                for v, macro in (f.get("macros") or {}).items():
                    if h.value(macro) != (int(v) << hi_lo[1]):
                        bad.append(f"{key}.{f['name']}: {macro} = 0x{h.value(macro):X}, expected {v} << {hi_lo[1]}")
        except (KeyError, ValueError) as e:
            bad.append(f"{key}: {e}")
    return bad


def main():
    h = Header(HEADER.read_text(encoding="utf-8") + "\n" + CORE_HEADER.read_text(encoding="utf-8"))
    errors, n = selftest(h)
    checked = 0
    if "--selftest" not in sys.argv and DATA.is_file():
        regs = load_data()
        errors += check_data(h, regs)
        checked = len(regs)
    for e in errors:
        print("ERROR", e)
    note = f"{checked} register(s) checked" if DATA.is_file() else "no register data (site/assets/js/data/regs-stm32g474.js missing)"
    print(f"check-regs: header self-test {n - len([e for e in errors if e.startswith('self-test')])}/{n} ok, {note}, {len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
