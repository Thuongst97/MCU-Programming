#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Static analysis with cppcheck and its MISRA C:2012 addon, as a ratchet (PLAN.md §10, CLAUDE.md rule 7).

  python3 tools/run-misra.py            # fail if any file has more findings of a rule than the baseline
  python3 tools/run-misra.py --update   # rewrite tools/misra-baseline.json after fixing findings
  python3 tools/run-misra.py --list     # print every finding

The addon runs WITHOUT a rule-texts file: findings name the rule number only. Rules disapplied for
the whole project are listed in DISAPPLIED, each with its record in docs/misra/. Deviations limited to
one place are listed in SCOPED with their record. A single deviation in code uses an inline
suppression that names its record:
    // cppcheck-suppress misra-c2012-11.5 ; DEV-002
New code must be clean; the baseline only shrinks.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "tools" / "misra-baseline.json"
# project-wide disapplications of advisory rules: rule -> record (docs/misra/...)
DISAPPLIED = {"15.5": "docs/misra/compliance.md#disapplied-15-5", "2.3": "docs/misra/compliance.md#disapplied-2-3-2-4-2-5",
              "2.4": "docs/misra/compliance.md#disapplied-2-3-2-4-2-5", "2.5": "docs/misra/compliance.md#disapplied-2-3-2-4-2-5"}
# Deviations limited to a place: (rule, path regex, source-line regex or None, record). Findings that match
# are counted as "deviated", listed with --list, and never fail the check.
AR = r"^(autosar|capstone/turnlight/stage3-autosar)/"
SCOPED = [
    ("20.1", AR, r'#include\s+"\w+_MemMap\.h"', "DEV-001"),           # AUTOSAR memory mapping
    ("20.7", r"^autosar/include/Compiler\.h$", None, "DEV-004"),       # compiler abstraction macros take types
    ("20.10", r"^autosar/os_shim/Os\.h$", None, "DEV-005"),            # OSEK TASK()/ALARMCALLBACK() name pasting
    ("8.9", AR, None, "docs/misra/compliance.md#disapplied-8-9"),      # file scope so MemMap can place the data
    ("8.7", r"^autosar/", None, "docs/misra/compliance.md#disapplied-8-7"),   # library API used by other projects
    ("8.6", r".*", r"^\s*int main\(void\)", "docs/misra/compliance.md#tool-artefacts"),   # every example has a main()
]
SOURCES = [
    "examples/common/bsp/*.c", "examples/common/startup/*.c", "examples/00-nucleo-blink-uart/bare/src/*.c",
    "examples/[0-9][0-9]-*/src/*.c", "examples/common/gallery/src/good.c",
    "autosar/**/*.c", "capstone/**/*.c",
]
INCLUDES = [
    "examples/common/bsp", "third_party/cmsis_core/Include", "third_party/cmsis_device_g4/Include",
    "third_party/freertos_kernel/include", "third_party/freertos_kernel/portable/GCC/ARM_CM4F",
]


def sources():
    out = []
    for pat in SOURCES:
        out += [p for p in sorted(ROOT.glob(pat)) if "/test/" not in p.as_posix() and "third_party" not in p.parts and "gallery" not in p.parts]
    return sorted(set(out))


def run():
    cpp = shutil.which("cppcheck")
    if not cpp:
        sys.exit("run-misra: cppcheck not found (apt install cppcheck)")
    files = sources()
    incs = list(INCLUDES) + sorted({str(f.parent.relative_to(ROOT)) for f in files})
    incs += [str(p.relative_to(ROOT)) for p in sorted(ROOT.glob("autosar/**/include")) + sorted(ROOT.glob("autosar/**/config"))]
    with tempfile.TemporaryDirectory() as build:
        cmd = [cpp, "--addon=misra", "--enable=style,warning,performance,portability", "--std=c11", "--platform=unix32",
               "-DSTM32G474xx", "--inline-suppr", "--suppress=missingIncludeSystem", "--suppress=*:*third_party/*",
               "--suppress=unusedFunction", f"--cppcheck-build-dir={build}", "-q",
               "--template={file}:{line}:{id}:{message}"]
        cmd += [f"--suppress=misra-c2012-{r}" for r in DISAPPLIED]
        cmd += [f"-I{i}" for i in incs]
        cmd += [str(f.relative_to(ROOT)) for f in files]
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    findings = []
    for line in r.stderr.splitlines():
        m = re.match(r"^([^:]+):(\d+):([\w.-]+):(.*)$", line)
        if m and "third_party" not in m.group(1):
            findings.append((m.group(1), int(m.group(2)), m.group(3), m.group(4).strip()))
    kept, deviated = [], []
    for f, line, rule, msg in findings:
        src = ""
        try:
            src = (ROOT / f).read_text(encoding="utf-8").splitlines()[line - 1]
        except (OSError, IndexError):
            pass
        rec = next((r for (ru, pr, lr, r) in SCOPED if rule == f"misra-c2012-{ru}" and re.search(pr, f)
                    and (lr is None or re.search(lr, src))), None)
        (deviated if rec else kept).append((f, line, rule, msg if not rec else rec))
    return files, kept, deviated


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--update", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    files, findings, deviated = run()
    counts = Counter((f, rule) for f, _, rule, _ in findings)
    current = {}
    for (f, rule), n in sorted(counts.items()):
        current.setdefault(f, {})[rule] = n
    if a.list:
        for f, line, rule, msg in sorted(findings):
            print(f"{f}:{line}: {rule}  {msg if not rule.startswith('misra') else ''}")
        for f, line, rule, rec in sorted(deviated):
            print(f"{f}:{line}: {rule}  deviated: {rec}")
    if a.update:
        BASELINE.write_text(json.dumps(current, indent=1, sort_keys=True) + "\n", encoding="utf-8")
        print(f"run-misra: baseline written, {len(findings)} finding(s) in {len(current)} file(s)")
        return 0
    base = json.loads(BASELINE.read_text(encoding="utf-8")) if BASELINE.is_file() else {}
    errors, better = [], 0
    for (f, rule), n in sorted(counts.items()):
        allowed = base.get(f, {}).get(rule, 0)
        if n > allowed:
            lines = [str(l) for ff, l, rr, _ in findings if ff == f and rr == rule]
            errors.append(f"{f}: {rule} {n} > baseline {allowed} (lines {', '.join(lines)})")
    for f, rules in base.items():
        for rule, n in rules.items():
            if counts.get((f, rule), 0) < n:
                better += 1
    for e in errors:
        print("NEW  " + e)
    if better:
        print(f"run-misra: {better} baseline entr(y/ies) improved — run with --update to lock the gain in")
    print(f"run-misra: {len(files)} file(s), {len(findings)} finding(s), {len(errors)} new, {len(deviated)} covered by a recorded deviation")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
