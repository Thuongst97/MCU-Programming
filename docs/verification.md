# Verification status

What has been checked, how, and what is still open. Read this before you trust a page for real
work, and update it whenever an item below changes. The per-item AUTOSAR log is
[`autosar-self-review.md`](autosar-self-review.md); MISRA is in [`misra/compliance.md`](misra/compliance.md).

Last full run: 2026-10-26 (after the move to the NUCLEO-G474RE, PLAN.md D13).

## Checked automatically (CI runs these on every push)

| What | How | Result |
|---|---|---|
| Every page in `SITE` exists, is linked, has its sections, ≥ 3 primary refs, no TODO left | `tools/check-site.py` | 31 pages ready, 0 errors |
| Code on pages matches the files in the repo | `tools/embed-code.py --check` | 196 embedded blocks, 0 errors |
| Register-viewer data matches `stm32g474xx.h` / `core_cm4.h` (addresses, bit fields) | `tools/check-regs.py` | 44 registers, 0 errors |
| Pin data is generated from ST's open pin data; every `AF_<pin>_<signal>` constant matches it | `tools/gen-pins.py --check`, `tools/check-pins.py` | 22 AF constants, 0 errors |
| Every page transfers ≤ 400 KB (fonts excluded) | `tools/check-budget.py` | heaviest page ≈ 144 KB |
| AUTOSAR-style conventions (banners, naming, MemMap pairs, DET, SWC includes) | `tools/check-autosar.py` | 0 errors |
| Generated AUTOSAR config headers are current | `tools/gen-autosar-cfg.py --check` | up to date |
| Firmware builds with `-Wall -Wextra -Werror` (all examples, `autosar/`, capstone stages) | CI `firmware` job | green |
| Pure logic (debouncer, scheduler, breathing curve, ring buffer, shell, ADC maths, OLED graphics, JEDEC parsing, fault decoding, bootloader protocol, LIN, TurnLight logic, gallery) | Unity + CTest, CI `host-tests` | 16 test executables pass |
| MISRA C:2012 ratchet: no new findings beyond the baseline | `tools/run-misra.py` (cppcheck addon), CI `static-analysis` | 0 new findings |
| Every page loads with zero console errors; search and glossary work | Playwright smoke, CI `browser-smoke` | 7 tests pass |
| Accessibility (WCAG 2 A/AA + best practice) on all 32 pages, both themes | axe-core, run locally (not in CI) | 0 violations |
| No horizontal scrolling at 390 px and 1280 px, zero console errors | Playwright script, run locally | all pages clean |

There is no simulator for the STM32G4 (Renode has no model of it), so nothing beyond the host tests
has been executed. Each example page's "How this was verified" callout says exactly that.

## Not checked yet

1. **Nothing has run on a real NUCLEO-G474RE.** Every example's `tested_on` list is empty. The site's
   hardware steps (wiring, OpenOCD output, LED and OLED behaviour, CAN between two boards, LIN,
   current in Stop mode) are written from the manuals and ST's sources. Validate each example
   on hardware and fill in `tested_on` (CLAUDE.md, "How to add a new example").
2. **Document section numbers.** RM0440, DS12288, PM0214, UM2505, ES0430 and AN2606 section
   numbers in the `R` entries were written without the PDFs at hand (st.com was not reachable from
   the build environment). Register addresses and bit fields are machine-checked against the CMSIS
   header, but the cited § numbers are not. PLAN.md items marked 📄 are still open (Phase 0).
3. **AUTOSAR requirement IDs.** No `SWS_`/`SRS_` ID is cited yet, because autosar.org was not
   reachable. AUTOSAR pages carry a "Verification status" callout and every item to check is
   listed in `autosar-self-review.md`. CLAUDE.md rule 13b forbids writing IDs from memory.
4. **External URLs.** Reference links were written, not clicked. The weekly `links-weekly.yml`
   job (lychee) reports dead links as an issue.
5. **Tool versions marked 📄** in PLAN.md §6 (st.com tools, Cortex-Debug, stm32flash) are not pinned
   in `tools/versions.json` yet.
9. **G4 values taken from ST's sources rather than the PDFs** (to confirm against RM0440/DS12288/UM2505):
   B1 polarity (ST's BSP says pressed = 1, a community board file says 0), DMAMUX request IDs (ADC1 = 5,
   SPI2_RX = 12, SPI2_TX = 13), the flash unlock keys, the FDCAN message-RAM layout (0x350 bytes per
   instance), the system-bootloader interfaces of the G47x (AN2606), the IDD jumper and LED numbering
   of the NUCLEO-64, and the LSI spread used by the IWDG calculator.
6. **The toolchain install on Windows and macOS** has not been tried. Linux was used for every build.
7. **Beta rounds** (PLAN.md §11, phases 2b and 8) have not happened. Use
   [`beta-feedback-template.md`](beta-feedback-template.md).
8. **Lighthouse** was not run (axe-core, the engine behind its accessibility score, was). Screen-reader
   testing with a real screen reader has not been done.

## How to close an item

Change the source of truth (example README `tested_on`, the `R` entry in `core.js`,
`tools/autosar-ids.txt`, `tools/versions.json`), run the checks in CLAUDE.md "How to add a new
module" step 9, and move the line from "Not checked yet" to the table above with the date.
