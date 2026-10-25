# MISRA C compliance stance (teaching project)

The course measures its firmware against **MISRA C:2012 including its amendments**, rule numbers
only. The rule texts are copyrighted; nothing here quotes them. Explanations are our own words.
How it is checked: `python3 tools/run-misra.py` (cppcheck's MISRA addon, no rule-texts file), run in
CI by the `static-analysis` job.

## What "compliant" means here

- **New code is clean.** The CI job fails when a file has more findings of a rule than
  `tools/misra-baseline.json` allows. The baseline records the findings that existed when the
  check was introduced (examples 01–08); it only ever shrinks (`--update` after fixing).
- **Mandatory and required rules** are never disapplied. A justified exception in one place is a
  *deviation* (DEV-003, DEV-004 below): an inline suppression that names its record, e.g.
  `// cppcheck-suppress misra-c2012-11.5 ; DEV-002`, plus a file in `docs/misra/deviations/`.
- **Advisory rules** may be disapplied for the whole project when a record below says why.
- cppcheck covers a large part of the decidable rules, not all of them. Directives and
  undecidable rules are reviewed by people (`quality.html#misra`).

## Disapplied advisory rules

### Disapplied 15.5

Rule 15.5 (advisory) prefers that a function returns only at its end. The course returns early
from guard clauses ("timeout → return error", "invalid argument → return false") because the
alternative, a status variable threaded through nested `if`s, is harder to read and review for
the beginners this course is written for. Every function still has one clear purpose and the
early returns all sit at its top. Recorded: Phase 5.

### Disapplied 2.3, 2.4, 2.5

Rules 2.3, 2.4 and 2.5 (all advisory) ask that a project declares no type, tag or macro it never
uses. Our headers are interfaces: `TL_CAN_ID_ACK` or `PORT_E_PARAM_PIN` are declared for every
user and used in other translation units. cppcheck checks one translation unit at a time and
reports every such declaration as unused, so these findings say nothing about our code. A
whole-program check (a linker map review or a CTU-capable tool) replaces them. Recorded: Phase 6.

### Disapplied 8.9

Rule 8.9 (advisory) prefers block scope for an object used in one function. In the AUTOSAR-style
code (`autosar/`, `stage3-autosar/`) every module variable is at file scope on purpose, between
`<MSN>_START_SEC_VAR_...` and `STOP` markers, so the memory mapping can place it; a `static` inside a
function cannot be mapped. Scope: those two folders only. Recorded: Phase 6.

### Disapplied 8.7

Rule 8.7 (advisory) prefers internal linkage when a function is referenced from one translation
unit. Library APIs in `autosar/` (`SetEvent`, `Dio_WritePort`, ...) exist for every user of the
library, including ones not in this repository. Scope: `autosar/` only. Recorded: Phase 6.

### Tool artefacts

`tools/run-misra.py` analyses every example together, so cppcheck sees one `main()` per example and
reports Rule 8.6 for them. Each example is its own program; the finding is filtered for `int main(void)`.

## Deviations

| ID | Rule | Where | Record |
|---|---|---|---|
| DEV-000 | Template | — | [`deviations/DEV-000-template.md`](deviations/DEV-000-template.md) |
| DEV-001 | 20.1 (advisory) | MemMap includes in AUTOSAR-style code | [`deviations/DEV-001.md`](deviations/DEV-001.md) |
| DEV-002 | 11.5 (advisory) | `Com_SendSignal`/`Com_ReceiveSignal` | [`deviations/DEV-002.md`](deviations/DEV-002.md) |
| DEV-003 | 11.6 (required) | OS shim task parameter | [`deviations/DEV-003.md`](deviations/DEV-003.md) |
| DEV-004 | 20.7 (required) | `Compiler.h` | [`deviations/DEV-004.md`](deviations/DEV-004.md) |
| DEV-005 | 20.10 (advisory) | `Os.h` task macros | [`deviations/DEV-005.md`](deviations/DEV-005.md) |

The findings left in `tools/misra-baseline.json` are open items, not accepted exceptions.
