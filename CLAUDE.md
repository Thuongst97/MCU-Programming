# CLAUDE.md — MCU Academy authoring rules

Read this first in every session. The full design lives in [`PLAN.md`](PLAN.md). This file holds the
rules that must never drift. If PLAN.md and this file disagree, this file wins; update PLAN.md.

## What this repo is
A static learning site (`site/`, deployed to GitHub Pages) that teaches MCU programming, from first
principles to AUTOSAR Classic. **Every example runs on one board: the NUCLEO-G474RE
(STM32G474RET6, Arm Cortex-M4 with FPU, 170 MHz), programmed through its on-board ST-LINK/V3E over
SWD.** The STM32G474VET6 (LQFP100) is the same die: firmware runs unchanged, only package pin
numbers differ. Example firmware lives in `examples/`, `autosar/` and `capstone/`. It compiles in
CI and is embedded into pages by tool, never pasted by hand. There is **no simulator** for this
chip (Renode has no STM32G4 model): examples are hardware-only, and pure logic is host-tested.

The site is a sibling of `Thuongst97/Android-Knowledge/aaos14-academy`. When unsure how something
should look or behave, do what that site does.

## Hard rules

### Accuracy
1. **Board facts use STM32G4 names and values from RM0440**: `GPIOx_MODER/OTYPER/OSPEEDR/PUPDR/AFR`,
   `RCC_AHB2ENR`, `RCC_PLLCFGR`, `PWR_CR5`, `FDCAN_NBTP/DBTP`, `LPUART1`, `DMAMUX`, and so on. Never
   use STM32F1-style registers (`CRL/CRH`, `AFIO_MAPR`, bxCAN `CAN_BTR`) except on a page that
   explicitly compares families.
2. Memory: **512 KB flash, 128 KB SRAM** = SRAM1 80 KB + SRAM2 16 KB (one contiguous 96 KB region at
   `0x20000000`) + CCM SRAM 32 KB at `0x10000000`. The linker script has `RAM` (96 KB) and `CCMRAM`
   (32 KB) regions; the stack lives in `RAM`. DMA can't reach CCM SRAM: never put a DMA buffer there.
3. Every technical claim must be traceable to a source listed in the page's references:
   DS12288, RM0440, PM0214, ES0430, UM2505, AN2606, ARM DDI 0403/0439, AUTOSAR CP R25-11
   documents, ISO summaries, tool manuals. ST's GitHub sources (CMSIS header, NUCLEO BSP,
   STM32_open_pin_data) back register and pin facts. Cite the **document ID + section** in the `R` entry.
   Community sources (forums, vendor schematics) get `kind: "community"` and their claims are
   phrased as "on most boards; check yours".
4. Pinned tool and library versions live **only** in `tools/versions.json`. Pages render them from
   there. Never type a tool version number into prose. (Spec editions are fixed decisions and may be
   written out: AUTOSAR CP **R25-11**, **MISRA C:2012** numbering.)
5. Hardware honesty: every example page has a "How this was verified" callout (✅ / ⚠️ / ❌):
   builds in CI, host-tested logic, and whether it has run on a real NUCLEO-G474RE (`tested_on`).
   Never claim a simulation or a hardware run that didn't happen.
6. Known traps that must be taught correctly wherever they come up:
   - LD2 on PA5 is **active-high** (1 = on). PA5 is also Arduino D13 / `SPI1_SCK`: never use SPI1 on PA5 with the LED.
   - B1 (USER) on PC13 reads **1 when pressed** per ST's NUCLEO BSP; a community board file says the
     opposite, so pages say "check yours" and code keeps the polarity in `BOARD_BTN_PRESSED`.
   - SWD is PA13/PA14 (SWO on PB3). Never change their `MODER`/`AFR`: that locks out the debugger
     until a connect-under-reset.
   - 170 MHz needs range 1 **boost** (`PWR_CR5.R1MODE = 0`), 4 flash wait states (`FLASH_ACR_LATENCY_4WS`,
     a real value macro on the G4) and an **AHB ÷2 step for ≥ 1 µs** when switching SYSCLK above 80 MHz.
   - FPU: enable CP10/CP11 in `SCB->CPACR` before any floating-point instruction (the build uses
     `-mfloat-abi=hard`). An exception that uses the FPU stacks 18 extra words (lazy stacking).
   - Timer clocks are ×2 when an APB prescaler ≠ 1 (at the course setup both are ÷1, so timers run at 170 MHz).
   - DMA requests go through **DMAMUX**: enabling a DMA channel without its DMAMUX request does nothing.
   - The ADC leaves deep power-down (`DEEPPWD = 0`), starts its regulator (`ADVREGEN`, then wait),
     and calibrates (`ADCAL`) before `ADEN`. Skipping a step gives wrong or no conversions.
   - FDCAN message RAM has a fixed layout on the G4; the NUCLEO has **no CAN transceiver**, and the one
     you add must be rated for the CAN FD data bit rate.
   - Flash is programmed in 64-bit double words; page size depends on the `DBANK` option bit.
   - Every hardware wait loop has a timeout.
   - Never edit installed OpenOCD scripts; use `examples/common/openocd/nucleo-g474re.cfg`.

### Copyright
7. **MISRA C / AUTOSAR C++14 guidelines are copyrighted.** Cite rule numbers ("MISRA C:2012
   Rule 10.4") and paraphrase the intent in your own words. Never reproduce rule headlines or
   amplification text. The cppcheck MISRA addon runs without a rule-texts file. Use **MISRA C:2012
   numbering including its amendments** everywhere. The newer consolidated edition is mentioned only
   in the one note on `quality.html#misra`.
8. AUTOSAR specs: cite document name + requirement ID (`[SWS_Dio_nnnnn]`, copied from the PDF and
   added to `tools/autosar-ids.txt`). Short API signatures are fine. Don't copy prose passages or
   figures; draw our own diagrams.
9. ST/Arm manuals: no copied figures, tables or long text. Redraw and paraphrase. Register field
   descriptions are written in our words with the RM0440 section cited.
10. Third-party code is **vendored into `third_party/<component>/`**: only the needed subset, the
    upstream LICENSE unchanged, and a README with the upstream URL, tag, full commit SHA and update
    command. Never edit it in place; update only with `python3 tools/update-third-party.py <component> <tag>`,
    which also updates `tools/versions.json`. **No git submodules, no CMake FetchContent**, so a ZIP
    download builds offline. The only exception is the CubeMX-generated HAL inside
    `examples/00-nucleo-blink-uart/hal/`.
10a. **The STM32G474 SVD is not committed** (PLAN.md §2.4). Cortex-Debug uses
    `.cache/svd/STM32G474.svd` from `tools/fetch-svd.py`. Register-viewer data
    (`site/assets/js/data/regs-stm32g474.js`) is hand-authored from RM0440, in our own words, and
    `tools/check-regs.py` must pass (addresses and bit fields match `stm32g474xx.h`). Pin data
    (`site/assets/js/data/nucleo-pins.js`) is generated from ST's open pin data by `tools/gen-pins.py`,
    and `tools/check-pins.py` checks every `AF_<pin>_<signal>` constant in the firmware against it.
10b. Licences: code is **MIT**. Every new code file (C, H, S, ld, CMake, Python, JS, CSS) starts with
    `SPDX-License-Identifier: MIT`. Prose and diagrams are **CC BY 4.0** (`LICENSE-CONTENT`, stated in
    the footer).

### AUTOSAR honesty
11. Our MCAL/RTE/BSW is **teaching code, not AUTOSAR-conformant**. Every file in `autosar/` and
    `capstone/turnlight/stage3-autosar/` starts with the banner from PLAN.md §8.2, which states the
    spec reference and whether the file is GENERATED / VENDOR-SUPPLIED / HAND-WRITTEN in production.
12. Follow the conventions checklist in PLAN.md §8.3 (`<Ma>_<Api>`, `Std_ReturnType`, platform types,
    `<Ma>_ConfigType` + `<Ma>_Init`, MemMap START/STOP pairs, compiler abstraction macros, DET
    for development errors, DEM for production errors, version macros, `MainFunction`s scheduled
    and not called from ISRs, SWCs never include MCAL headers). `tools/check-autosar.py` must pass.
13. The OS used by the AUTOSAR stage is `autosar/os_shim`: an OSEK/AUTOSAR-OS-like API (`ActivateTask`,
    `TerminateTask`, `SetRelAlarm`, `SetEvent`, `WaitEvent`, `GetResource`, …) over FreeRTOS. It is
    always labelled **"not a real AUTOSAR OS"**, and its differences table (PLAN.md §8.2) stays
    accurate. Trampoline is backlog only.
13a. **AUTOSAR R25-11 is the only release cited.** Where real ECUs (R4.x) differ in an API, file layout,
    configuration class or behaviour, add an "In production (R4.x)" box:
    `<div class="callout prod" data-doc="AUTOSAR_SWS_DIODriver R4.4.0">…</div>`. Never re-pin to a new
    release in passing; that is the separate "R26-11 review" milestone (PLAN.md §11).
13b. No requirement ID, no claim: every AUTOSAR rule, API, type, error code or behaviour on the site or in
    `autosar/` cites `AUTOSAR_CP_SWS_*`/`_SRS_*` + requirement ID, listed in `tools/autosar-ids.txt` and
    logged in `docs/autosar-self-review.md`. Use the AUTOSAR self-review checklist below.

### Code shown on the site
14. **Never hand-paste code into a page.** Use
    `<script type="text/plain" data-src="examples/…" data-region="name" data-lang="c" data-file="main.c" id="src-…"></script>`
    and run `python3 tools/embed-code.py`. CI runs `--check`.
15. Prefer named regions (`// [region:clock]` … `// [endregion]`) over line ranges.
16. Annotation markers sit at line end inside a comment: `// «3»` (C), `@ «3»` (asm),
    `/* «3» */` (ld), `# «3»` (CMake/tcl/robot). Notes go in the page script as
    `NOTES = { 3: ["Title", "html explanation"] }`.
17. "Bad" code in bad-vs-good comparisons must also compile (warnings allowed only where noted).
18. Firmware style: C11, `-Wall -Wextra -Werror` for our code, `.clang-format` in repo, no dynamic
    allocation, no recursion, fixed-width types (`uint32_t`) outside AUTOSAR BSW (which uses `uint32` etc.).
19. **Plain registers through the CMSIS device header** (`stm32g474xx.h` from `third_party/cmsis_device_g4`)
    are the main style: `RCC->CFGR`, `RCC_CFGR_SW_PLL`, `FLASH_ACR_LATENCY_4WS`, `(85U << RCC_PLLCFGR_PLLN_Pos)`.
    **Never hand-type a peripheral address or a magic bit value** in firmware. Values the header doesn't
    name get a named constant with its source: alternate-function numbers as `AF_<pin>_<signal>`
    (`examples/common/bsp/board.h`), CPACR fields in the startup. Teaching snippets that show the raw
    address are labelled "what the macro expands to".
20. HAL appears **only** in `setup.html` (path A, side-by-side comparison, `examples/00-…/hal/`). LL appears
    **only** in Appendix D (`ll-drivers.html`, `examples/00-…/ll/`). Neither becomes a parallel track.
21. Startup code is **C** (`startup.c` / `examples/common/startup/startup_stm32g474.c`). ST's assembly
    startup is shown once, on `boot.html#c-vs-asm`, as a comparison.
22. Build system: **CMake + Ninja only**. No Makefiles anywhere. What CMake generates is explained once,
    on `setup.html#cmake-under-hood`.
23. Tests: **Unity** (+ **CMock** only when a test needs mocks) driven by **CMake/CTest**. No Ceedling, so no
    Ruby in CI (the CMock generator may need Ruby on the author's machine; commit the generated mocks).
    The Playwright smoke test (`tests/site/smoke.spec.mjs`) must pass: every page loads with zero
    console errors.

### CI
24. Every GitHub Action is pinned by **full commit SHA with the version as a comment**
    (`uses: actions/checkout@<sha> # v4.2.2`). Dependabot (`.github/dependabot.yml`) proposes updates;
    never replace a SHA with a tag.

### UI text
25. English only. **All UI strings** (nav, placeholders, buttons, pager, footer, engine labels) live in
    `site/assets/js/strings.js` (`window.MCU_STRINGS`). `core.js` and engines never hard-code
    user-visible text. Don't build any other i18n machinery.

### Pages
26. Every page is an entry in `SITE` (core.js) with `status: "planned"` (shown greyed out with its roadmap
    phase, **never linked**, its HTML file must not exist) or `"ready"` (file exists, linked everywhere).
    `tools/new-module.py <id>` is the only way a page goes from planned to ready; check-site.py enforces both states.
27. Engines that no published page uses yet must be exercised in `tests/site/fixtures/engines.html` so the
    smoke test catches their runtime errors.

## Content style guide

- **Language:** English. Audience: software engineers new to embedded/automotive (the author comes from
  Android Automotive) and juniors. Assume C knowledge, no electronics knowledge.
- **Tone:** direct, concrete, friendly. Use second person ("you"), short paragraphs, active voice.
  Explain *why* before *how*. No filler, no hype, no emoji in prose (icons only in `SITE.icon`
  and callout icons).
- **Every module must contain:**
  1. at least one **interactive diagram** (engine-based, not a static image);
  2. **real code annotated line by line** (embedded from `examples/`);
  3. an **everyday analogy** in a `callout analogy`;
  4. a **"Pitfalls"** or `callout warn` where hardware can bite;
  5. **official references** via `REFS[pageId]`, with at least 3 primary sources;
  6. for hands-on modules, a **"You are done when…"** checklist.
- **Callouts:** `analogy` (🎭 or a fitting icon), `note` (background/new info), `tip`
  (practical shortcut), `warn` (can damage hardware, lock you out, or silently break), `prod`
  (🏭 "In production (R4.x)", AUTOSAR pages only, needs `data-doc`).
- **Numbers:** always with units and the condition (`36 MHz max on APB1`, `~3 mA sink on PC13`).
  Hex in C style (`0x40021004`), registers in `code`.
- **Hypothetical data** (CAN IDs, DIDs, DTCs) is marked "hypothetical" in text and in the footer
  disclaimer.
- **Simulation vs hardware:** say which one the reader is looking at.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Page file | kebab-case, matches `SITE.id` | `adc-dma.html`, `id: "adc-dma"` |
| Section id | kebab-case, unique per page, **never renamed after publish** | `#clock-72` |
| Section number | `<module num>.<n>` in `.sec-num`; references auto-append as the last number | `4.3` |
| Page script | `site/assets/js/pages/<page-id>.js` (+ `<page-id>-<topic>.js` if large) | `pages/setup.js` |
| Engine | `site/assets/js/engines/<engine>.js`, exported on `window.MCU.<Name>` | `MCU.Register` |
| Data file | `site/assets/js/data/<subject>.js`, exported on `window.MCU_DATA.<key>` | `MCU_DATA.nucleo` |
| DOM ids for diagrams | `<kind>-<topic>` | `#clk-tree`, `#seq-irq-entry`, `#reg-rcc-cfgr` |
| Embedded source ids | `src-<example>-<region>` | `src-00-clock` |
| CSS component classes | short prefix per engine | `.pin-*`, `.reg-*`, `.clk-*`, `.wv-*`, `.mm-*` |
| localStorage keys | `mcu-` prefix, always wrapped in try/catch | `mcu-theme`, `mcu-code-lang`, `mcu-os`, `mcu-done-<page>` |
| Example folder | `examples/NN-kebab-name/` (NN two digits, catalog order) | `examples/05-adc-pot-dma/` |
| Example targets | `NN-kebab-name.elf/.hex/.bin`; CMake target `flash-<name>` | `flash-00-nucleo-blink-uart` |
| Images | `site/assets/img/<page-id>-<what>.webp`, ≤ 150 KB, with `alt` text | `setup-nucleo-usb.webp` |
| Reference keys (`R`) | camelCase, doc-oriented | `rm0008Rcc`, `ds5319Pins`, `swsDio` |

## AUTOSAR self-review checklist
Run this for every AUTOSAR page (modules 18–23, 26) and every file in `autosar/` and
`capstone/turnlight/stage3-autosar/` before the change is merged. Record the result in
`docs/autosar-self-review.md`.

- [ ] Every rule, API signature, type, error code, config parameter and behaviour has a citation:
      `AUTOSAR_CP_SWS_<Module>` / `_SRS_<Name>` (R25-11) + requirement ID copied from the PDF.
- [ ] Every cited ID is in `tools/autosar-ids.txt` with document, section/page and the date it was read.
- [ ] API names, parameter order, parameter types and return types match the SWS exactly
      (`Std_ReturnType`, `const <Ma>_ConfigType*`, …). Unsupported APIs are listed as such, never stubbed silently.
- [ ] Module ID, vendor ID and AR release version macros are present and consistent with the BSW module list.
- [ ] DET error IDs and API IDs use the SWS values; production errors go to DEM, not DET.
- [ ] MemMap START/STOP pairs are balanced and section names follow SWS_MemoryMapping.
- [ ] Compiler abstraction macros are used in BSW signatures as defined for R25-11.
- [ ] SWCs include only `Rte_<Swc>.h`, never BSW or MCAL headers; RTE API names follow SWS_RTE.
- [ ] The file banner states the spec reference and GENERATED / VENDOR-SUPPLIED / HAND-WRITTEN in production.
- [ ] Anything simplified ("-lite") says what was left out and why.
- [ ] Where R4.x differs, an "In production (R4.x)" box names the R4.x document.
- [ ] `tools/check-autosar.py` and the cppcheck MISRA job pass, and every suppression references a deviation record.
- [ ] No sentence or figure is copied from an AUTOSAR document (paraphrase; our own diagrams).

## How to add a new module

1. **Check PLAN.md §3**: the module's id, number, group, sections and design sheet row. If you need
   to deviate, update PLAN.md in the same change.
2. Scaffold: `python3 tools/new-module.py <id>`. It creates `site/<id>.html` (one TODO section per SITE
   section) and `site/assets/js/pages/<id>.js` from `tools/templates/`, flips the SITE status to "ready" and
   adds an empty `REFS` entry. check-site.py fails until every TODO is written and ≥ 3 primary refs exist.
3. Fill the `SITE` entry: `num, group, title, short, icon, accent, desc`, and `sections` as
   `[id, title, search keywords]`. Keywords: lowercase, include register names and synonyms.
4. Write the page: `header.page-hero` (crumbs, eyebrow "Module NN · <Group>", `h1`, `.lead`,
   `.page-meta` with read time, level and main example), then one `section.doc-section[id][data-title]`
   per `SITE` section with `.sec-head h2 .sec-num`. Keep ids identical to `SITE`.
5. Example code: write or extend the example in `examples/` first, make it build
   (`cmake --preset nucleo-debug && cmake --build --preset nucleo-debug`), add regions and «n»
   markers, run its host tests and, if you can, run it on a NUCLEO-G474RE; then embed it with
   `tools/embed-code.py`.
6. Diagrams: use an existing engine with a data object. Only write a new engine if PLAN.md §9 has
   one planned; otherwise propose it in PLAN.md first.
7. References: add `R` entries (`{ t, url, doc, rev, sec, kind }`) and list them in `REFS[<id>]`.
8. Glossary: add every new term to `glossary-data.js` (`{term, cat, full, desc}`); diagram tooltips
   pick them up automatically. New UI labels (buttons, engine labels) go into `strings.js`, not the engine.
9. Run the local checks:
   `python3 tools/embed-code.py --check && python3 tools/check-site.py && python3 tools/check-regs.py && node --test tests/site/*.test.mjs && npm --prefix tests/site run smoke`
   and open the page through a local server (`python3 -m http.server -d site`) in both themes and at
   mobile width. Expect zero console errors. For AUTOSAR pages, also complete the self-review checklist above.
10. Commit with a message like `module 05 gpio: sections model…swj, example 01 regions`.

## How to add a new example
1. `examples/NN-name/` with `README.md` front matter (`id, title, modules, peripherals, flavor, hw, tested_on`),
   `CMakeLists.txt` (use `examples/common/cmake/nucleo.cmake`), `src/`, `expected-output.txt`,
   `wiring.svg` (export from the pinout engine), `test/` host tests if there is pure logic.
2. Use `examples/common/` (startup, linker, BSP, OpenOCD cfg). Don't copy them,
   except example 00, which owns its startup + linker on purpose for teaching. Include third-party code
   only from `third_party/` via the shared CMake helpers. If a new component is needed, vendor it with
   `tools/update-third-party.py` first.
3. Add the example to the catalog: `python3 tools/gen-catalog.py`.
4. Validate it on real hardware before marking `tested_on`.

## Local commands
Site:
```sh
python3 -m http.server -d site 8000                      # preview the site at http://localhost:8000
python3 tools/check-site.py && python3 tools/embed-code.py --check && python3 tools/check-regs.py
python3 tools/check-budget.py --list                     # page weight: ≤ 400 KB transferred per page
python3 tools/hero-art.py --write                        # regenerate the landing-page illustration
node tools/export-wiring.mjs                             # regenerate examples' wiring.svg from the pin data
python3 tools/gen-catalog.py                             # regenerate examples/README.md and catalog data
python3 tools/update-third-party.py --check              # verify third_party/ (or <component> <tag> to update)
python3 -m unittest discover -s tests/tools              # tool tests
node --test tests/site/*.test.mjs                        # runtime unit tests
npm ci --prefix tests/site && npm --prefix tests/site run smoke   # Playwright smoke test
#   no Playwright browser download possible? PW_CHROMIUM=/path/to/chrome npm --prefix tests/site run smoke
```
Firmware, simulation and analysis:
```sh
python3 tools/fetch-svd.py                               # SVD for Cortex-Debug → .cache/svd/ (not committed)
cmake --preset nucleo-debug && cmake --build --preset nucleo-debug   # every example, autosar/, capstone
cmake --build --preset nucleo-debug --target flash-00-nucleo-blink-uart   # OpenOCD + the on-board ST-LINK
python3 tools/check-pins.py                              # AF_ constants match ST's pin data
cmake --preset host-tests && ctest --preset host-tests   # Unity host tests
python3 tools/run-misra.py                               # MISRA ratchet (cppcheck); --list, --update
python3 tools/check-autosar.py                           # AUTOSAR-style conventions in autosar/ + stage 3
python3 tools/gen-autosar-cfg.py capstone/turnlight/stage3-autosar/cfg   # MemMap + Compiler_Cfg.h (--check in CI)
python3 tools/update-third-party.py freertos_kernel V11.3.2      # re-vendor a component (after editing versions.json)
```

## Git
- Work on the branch you are given. Commit small, coherent steps. Don't commit build outputs
  (`build/`, `*.elf` outside CI artifacts).
- Generated-and-committed files (`site/assets/js/data/memmap/*.js`, embedded code in HTML,
  `examples/README.md`) are regenerated by their tool, never edited by hand.
