# Verification status

What has been checked, how, and what is still open. Read this before you trust a page for real
work, and update it whenever an item below changes. The per-item AUTOSAR log is
[`autosar-self-review.md`](autosar-self-review.md); MISRA is in [`misra/compliance.md`](misra/compliance.md).

Last full run: 2026-10-25.

## Checked automatically (CI runs these on every push)

| What | How | Result |
|---|---|---|
| Every page in `SITE` exists, is linked, has its sections, ≥ 3 primary refs, no TODO left | `tools/check-site.py` | 31 pages ready, 0 errors |
| Code on pages matches the files in the repo | `tools/embed-code.py --check` | 195 embedded blocks, 0 errors |
| Register-viewer data matches `stm32f103xb.h` / `core_cm3.h` (addresses, bit fields) | `tools/check-regs.py` | 32 registers, 0 errors |
| Every page transfers ≤ 400 KB (fonts excluded) | `tools/check-budget.py` | heaviest page ≈ 132 KB |
| AUTOSAR-style conventions (banners, naming, MemMap pairs, DET, SWC includes) | `tools/check-autosar.py` | 0 errors |
| Generated AUTOSAR config headers are current | `tools/gen-autosar-cfg.py --check` | up to date |
| Firmware builds with `-Wall -Wextra -Werror` (all examples, `autosar/`, capstone stages) | CI `firmware` job | green |
| Pure logic (debouncer, scheduler, breathing curve, ring buffer, shell, ADC maths, OLED graphics, JEDEC parsing, fault decoding, bootloader protocol, LIN, TurnLight logic, gallery) | Unity + CTest, CI `host-tests` | 14 test executables pass |
| Behaviour in simulation | Renode + Robot, CI `renode-tests`: examples 00–12 and the TurnLight suite against stages 1, 2 and 3 | all pass |
| MISRA C:2012 ratchet: no new findings beyond the baseline | `tools/run-misra.py` (cppcheck addon), CI `static-analysis` | 0 new findings |
| Every page loads with zero console errors; search and glossary work | Playwright smoke, CI `browser-smoke` | 7 tests pass |
| Accessibility (WCAG 2 A/AA + best practice) on all 32 pages, both themes | axe-core, run locally (not in CI) | 0 violations |
| No horizontal scrolling at 390 px and 1280 px, zero console errors | Playwright script, run locally | all pages clean |

Simulation is not hardware. Each example page's "Simulation fidelity" callout says what Renode
does not reproduce (timing, analog values, OLED pixels, CAN bit timing, flash erase, power).

## Not checked yet

1. **Nothing has run on a real Blue Pill.** Every example's `tested_on` list is empty. The site's
   hardware steps (wiring, OpenOCD output, LED and OLED behaviour, CAN between two boards, LIN,
   current in Stop mode) are written from the manuals and the simulated runs. Validate each example
   on hardware (genuine ST and a clone) and fill in `tested_on` (CLAUDE.md, "How to add a new example").
2. **Document section numbers.** RM0008, DS5319, PM0056, PM0075, ES096, AN2606 and AN3155 section
   numbers in the `R` entries were written without the PDFs at hand (st.com was not reachable from
   the build environment). Register addresses and bit fields are machine-checked against the CMSIS
   header, but the cited § numbers are not. PLAN.md items marked 📄 are still open (Phase 0).
3. **AUTOSAR requirement IDs.** No `SWS_`/`SRS_` ID is cited yet, because autosar.org was not
   reachable. AUTOSAR pages carry a "Verification status" callout and every item to check is
   listed in `autosar-self-review.md`. CLAUDE.md rule 13b forbids writing IDs from memory.
4. **External URLs.** Reference links were written, not clicked. The weekly `links-weekly.yml`
   job (lychee) reports dead links as an issue.
5. **Tool versions marked 📄** in PLAN.md §6 (st.com tools, Cortex-Debug, stm32flash, Renode on
   macOS) are not pinned in `tools/versions.json` yet.
6. **The toolchain install on Windows and macOS** has not been tried. Linux was used for every build.
7. **Beta rounds** (PLAN.md §11, phases 2b and 8) have not happened. Use
   [`beta-feedback-template.md`](beta-feedback-template.md).
8. **Lighthouse** was not run (axe-core, the engine behind its accessibility score, was). Screen-reader
   testing with a real screen reader has not been done.

## How to close an item

Change the source of truth (example README `tested_on`, the `R` entry in `core.js`,
`tools/autosar-ids.txt`, `tools/versions.json`), run the checks in CLAUDE.md "How to add a new
module" step 9, and move the line from "Not checked yet" to the table above with the date.
