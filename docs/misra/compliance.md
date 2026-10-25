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
  *deviation*: an inline suppression that names its record, e.g.
  `// cppcheck-suppress misra-c2012-11.4 ; DEV-002`, plus a file in `docs/misra/deviations/`.
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

## Deviations

| ID | Rule | Where | Record |
|---|---|---|---|
| DEV-000 | Template | — | [`deviations/DEV-000-template.md`](deviations/DEV-000-template.md) |

No deviation is in use yet: the findings in the baseline are open items, not accepted exceptions.
