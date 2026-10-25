#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Machine-checkable AUTOSAR conventions (PLAN.md §8.3, CLAUDE.md rules 11-13b).

  python3 tools/check-autosar.py

Checks autosar/ and capstone/turnlight/stage3-autosar/:
  banner      every .c/.h starts with the teaching-code banner (spec reference + GENERATED /
              VENDOR-SUPPLIED / HAND-WRITTEN in production)
  naming      public functions in a module header are <Ma>_<Api> (callouts listed in CALLOUTS)
  types       no <stdint.h>/<stdbool.h> types in public BSW headers (platform types instead)
  funcmacro   BSW header prototypes use the FUNC() compiler-abstraction macro
  version     module headers publish VENDOR_ID, MODULE_ID, AR_RELEASE_* and SW_* versions
  memmap      every <MSN>_START_SEC_<X> is followed by its STOP before the next START, and each is
              followed by #include "<Msn>_MemMap.h"
  det         Det_ReportError is only reachable under <MA>_DEV_ERROR_DETECT == STD_ON
  cfg         symbolic names in <Ma>_Cfg.h use the <Ma>Conf_ prefix
  swc         SWC sources include their Rte_<Swc>.h (+ their own <Swc>_MemMap.h) and no BSW or MCAL header
  rte         RTE API macros follow Rte_(Read|Write|Call|IRead|IWrite)_<port>_<element>; runnables RE_<Swc>_<Name>
  dynamic     no malloc/calloc/realloc/free
  deviation   every cppcheck suppression names its deviation record (DEV-nnn)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "autosar"
PROJ = ROOT / "capstone/turnlight/stage3-autosar"
# Functions a module header may declare without its own prefix: callouts implemented by others.
CALLOUTS = {"EcuM_AL_DriverInitZero", "EcuM_AL_DriverInitOne", "EcuM_AL_DriverInitTwo", "ShutdownHook", "ErrorHook"}
OS_API = {"StartOS", "ShutdownOS", "ActivateTask", "TerminateTask", "ChainTask", "GetTaskID", "SetRelAlarm",
          "CancelAlarm", "SetEvent", "ClearEvent", "GetEvent", "WaitEvent", "GetResource", "ReleaseResource",
          "SuspendAllInterrupts", "ResumeAllInterrupts", "Os_AssertFailed"}
APP_LIBS = {"turnlight_sm.h", "lampmon.h"}       # application libraries an SWC may use (PLAN.md §5.2)
BSW_HEADER_NAMES = re.compile(r'#include\s+"(Std_Types|Platform_Types|Compiler|Det|Mcu|Port|Dio|Pwm|Adc|Wdg|WdgIf|Can|CanIf|PduR|Com|Dem|WdgM|EcuM|IoHwAb|Os|stm32f103xb|SchM_\w+|\w+_MemMap|\w+_Cfg)\.h"')
errors = []


def err(kind, path, msg):
    errors.append(f"ERROR [{kind}] {path.relative_to(ROOT)}: {msg}")


def files(base, exts=(".c", ".h")):
    return sorted(p for p in base.rglob("*") if p.suffix in exts and p.is_file())


def check_banner(p, text):
    head = text[:900]
    if "SPDX-License-Identifier: MIT" not in head or "NOT an AUTOSAR-conformant implementation" not in head:
        err("banner", p, "missing the teaching-code banner (PLAN.md §8.2)")
    elif "Spec reference" not in head or not re.search(r"In production\s*:\s*(GENERATED|VENDOR-SUPPLIED|HAND-WRITTEN)", head):
        err("banner", p, "banner needs 'Spec reference' and 'In production: GENERATED | VENDOR-SUPPLIED | HAND-WRITTEN'")


def module_of(p):
    return p.stem.split("_")[0]


def check_header(p, text):
    ma = module_of(p)
    if p.parent.parent.name not in ("mcal", "ecual", "services") and p.parent.name not in ("det", "os_shim"):
        return
    if p.stem != ma:                                    # only the main module header
        return
    if re.search(r"\b(u?int(8|16|32|64)_t|bool)\b|<stdint\.h>|<stdbool\.h>", text):
        err("types", p, "uses <stdint.h>/<stdbool.h> types in a public BSW header; use uint8, boolean ...")
    MA = ma.upper()
    if ma not in ("Os",):
        for macro in ("VENDOR_ID", "MODULE_ID", "AR_RELEASE_MAJOR_VERSION", "AR_RELEASE_MINOR_VERSION",
                      "AR_RELEASE_REVISION_VERSION", "SW_MAJOR_VERSION", "SW_MINOR_VERSION", "SW_PATCH_VERSION"):
            if not re.search(rf"#define\s+{MA}_{macro}\b", text):
                err("version", p, f"{MA}_{macro} is not defined")
    for m in re.finditer(r"^\s*FUNC\([^;]*?\)\s+(\w+)\s*\(", text, re.M):
        name = m.group(1)
        if not name.startswith(ma + "_") and name not in CALLOUTS:
            err("naming", p, f"public function {name} does not start with {ma}_")
    for m in re.finditer(r"^(?!\s*(?:#|\*|/\*|typedef|extern|FUNC|P2FUNC))\s*\w[\w\s\*]*?\b(\w+)\s*\([^;{]*\)\s*;", text, re.M):
        name = m.group(1)
        if ma == "Os" and name in OS_API | CALLOUTS:
            continue
        if ma != "WdgIf":
            err("funcmacro", p, f"prototype of {name} does not use FUNC()")


def check_memmap(p, text):
    open_sec = None
    lines = text.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"\s*#define\s+(\w+?)_(START|STOP)_SEC_(\w+)\s*$", line)
        if not m:
            continue
        msn, kind, sec = m.groups()
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
        if not re.match(rf'#include\s+"\w+_MemMap\.h"', nxt):
            err("memmap", p, f"line {i + 1}: {msn}_{kind}_SEC_{sec} is not followed by #include of a MemMap header")
        if kind == "START":
            if open_sec:
                err("memmap", p, f"line {i + 1}: START of {sec} while {open_sec} is still open")
            open_sec = f"{msn}_{sec}"
        else:
            if open_sec != f"{msn}_{sec}":
                err("memmap", p, f"line {i + 1}: STOP of {msn}_{sec} without a matching START")
            open_sec = None
    if open_sec:
        err("memmap", p, f"section {open_sec} is never stopped")


def check_det(p, text):
    if "Det_ReportError(" not in text or p.name in ("Det.c", "Det.h"):
        return
    ma = module_of(p).upper()
    guarded = re.search(rf"#if \({ma}_DEV_ERROR_DETECT == STD_ON\)[\s\S]*?Det_ReportError\([\s\S]*?#else", text)
    if not guarded:
        err("det", p, f"Det_ReportError must sit under #if ({ma}_DEV_ERROR_DETECT == STD_ON)")


def check_cfg(p, text):
    m = re.match(r"(\w+)_Cfg$", p.stem)
    if not m or m.group(1) in ("Os", "Det", "Compiler"):
        return
    ma = m.group(1)
    for d in re.finditer(r"#define\s+(\w+)\s+\(\(", text):
        if not d.group(1).startswith(ma + "Conf_"):
            err("cfg", p, f"symbolic name {d.group(1)} should start with {ma}Conf_")


def check_swc(p, text):
    swc = p.parent.name
    incs = re.findall(r'#include\s+"([^"]+)"', text)
    if f"Rte_{swc}.h" not in incs:
        err("swc", p, f"does not include its contract header Rte_{swc}.h")
    for inc in sorted(set(incs)):
        if inc not in (f"Rte_{swc}.h", f"{swc}_MemMap.h") and inc not in APP_LIBS:
            err("swc", p, f"includes {inc}: an SWC may include only Rte_{swc}.h (and application libraries)")
    if re.search(r'#include\s+<', text):
        err("swc", p, "includes a system header")


def check_rte(p, text):
    for m in re.finditer(r"#define\s+(Rte_\w+)\s+Rte_\w+", text):
        if not re.match(r"Rte_(Read|Write|Call|IRead|IWrite|Receive|Send)_[A-Za-z0-9]+_[A-Za-z0-9]+$", m.group(1)):
            err("rte", p, f"RTE API name {m.group(1)} does not follow Rte_<Api>_<port>_<element>")
    for m in re.finditer(r"FUNC\(void, \w+_CODE\)\s+(RE_\w+)\(", text):
        if not re.match(rf"RE_{p.stem.replace('Rte_', '')}_\w+$", m.group(1)):
            err("rte", p, f"runnable {m.group(1)} should be RE_<Swc>_<Name>")


def main():
    for p in files(LIB) + files(PROJ):
        text = p.read_text(encoding="utf-8")
        if p.suffix in (".c", ".h"):
            check_banner(p, text)
        if re.search(r"\b(malloc|calloc|realloc|free)\s*\(", text):
            err("dynamic", p, "dynamic memory is not allowed")
        for m in re.finditer(r"cppcheck-suppress\s+[\w.-]+(.*)", text):
            if not re.search(r"DEV-\d{3}", m.group(1)):
                err("deviation", p, "cppcheck suppression without a DEV-nnn record")
        if "gallery" in p.parts:
            continue                                   # the "before" halves break the rules on purpose
        check_memmap(p, text)
        check_det(p, text)
        if p.is_relative_to(LIB) and p.suffix == ".h":
            check_header(p, text)
        if p.parent.name == "cfg":
            check_cfg(p, text)
        if "asw" in p.parts and p.suffix == ".c":
            check_swc(p, text)
        if p.parent.name == "rte" and p.name.startswith("Rte_") and p.suffix == ".h":
            check_rte(p, text)
    for e in errors:
        print(e)
    n = len(files(LIB)) + len(files(PROJ))
    print(f"check-autosar: {n} file(s), {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
