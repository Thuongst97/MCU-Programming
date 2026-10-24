# CLAUDE.md — MCU Academy authoring rules

Read this first in every session. The full design lives in [`PLAN.md`](PLAN.md). This file holds the
rules that must never drift. If PLAN.md and this file disagree, this file wins; update PLAN.md.

## What this repo is
A static learning site (`site/`, deployed to GitHub Pages) that teaches MCU programming, from first
principles to AUTOSAR Classic. **Every example runs on one board: the STM32F103C8T6 "Blue Pill"
programmed with an ST-Link V2 over SWD.** Example firmware lives in `examples/`, `autosar/` and
`capstone/`. It compiles in CI and is embedded into pages by tool, never pasted by hand.

The site is a sibling of `Thuongst97/Android-Knowledge/aaos14-academy`. When unsure how something
should look or behave, do what that site does.

## Hard rules

### Accuracy
1. **Board facts use STM32F10x names and values from RM0008**: `GPIOx_CRL/CRH`, `RCC_APB2ENR`,
   `AFIO_MAPR`, bxCAN `CAN_BTR`, and so on. Never use STM32F4-style registers (`MODER`, `AFR`, `OSPEEDR`).
2. Memory: **64 KB flash, 20 KB SRAM**. Never rely on the undocumented second 64 KB, never use
   OpenOCD's stock `board/stm32f103c8_blue_pill.cfg` (it sets 128 KB), and never copy ST's
   `STM32F103XB_FLASH.ld` (128 KB, misaligned `_estack`).
3. Every technical claim must be traceable to a source listed in the page's references:
   DS5319, RM0008, PM0056, PM0075, ES096, AN2606, AN3155, ARM DDI 0403/0337, AUTOSAR CP R25-11
   documents, ISO summaries, tool manuals. Cite the **document ID + section** in the `R` entry.
   Community sources (forums, vendor schematics) get `kind: "community"` and their claims are
   phrased as "on most boards; check yours".
4. Pinned versions live **only** in `tools/versions.json`. Pages render them from there. Never type
   a version number into prose.
5. Simulation honesty: every example page has a "Simulation fidelity" callout (✅ / ⚠️ / ❌). Never
   imply that Renode reproduces timing, analog values, power, OLED pixels or CAN bit timing.
6. Known traps that must be taught correctly wherever they come up:
   - PC13 LED is **active-low**. PC13–PC15 sink only ~3 mA, run at ≤ 2 MHz and must not source current.
   - `AFIO_MAPR.SWJ_CFG`: use `JTAGDISABLE`, **never** `DISABLE` (that locks out SWD).
   - 72 MHz needs `FLASH_ACR.LATENCY = 2`, which is `(2U << FLASH_ACR_LATENCY_Pos)`. `FLASH_ACR_LATENCY_2` is the mask `0x4` (bit 2 of the field), **not** two wait states.
   - APB1 ≤ 36 MHz; timer clocks are ×2 when the APB prescaler ≠ 1; ADC clock ≤ 14 MHz.
   - USB and bxCAN share 512 B SRAM and IRQ vectors 19/20, so they can't run at the same time.
   - Every hardware wait loop has a timeout. Renode doesn't model `RCC_CFGR.SWS` without our overlay.
   - Clone chips report SW-DP ID `0x2ba01477`. Use `bluepill-clone.cfg`; never edit installed OpenOCD scripts.

### Copyright
7. **MISRA C / AUTOSAR C++14 guidelines are copyrighted.** Cite rule numbers ("MISRA C:2012
   Rule 10.4") and paraphrase the intent in your own words. Never reproduce rule headlines or
   amplification text. The cppcheck MISRA addon runs without a rule-texts file.
8. AUTOSAR specs: cite document name + requirement ID (`[SWS_Dio_nnnnn]`, copied from the PDF and
   added to `tools/autosar-ids.txt`). Short API signatures are fine. Don't copy prose passages or
   figures; draw our own diagrams.
9. ST/Arm manuals: no copied figures, tables or long text. Redraw and paraphrase. Register field
   descriptions are written in our words with the RM0008 section cited.
10. Vendored third-party code (`examples/third_party/`) keeps its licence file and is never edited
    in place. Record the version in `tools/versions.json`.

### AUTOSAR honesty
11. Our MCAL/RTE/BSW is **teaching code, not AUTOSAR-conformant**. Every file in `autosar/` and
    `capstone/turnlight/stage3-autosar/` starts with the banner from PLAN.md §8.2, which states the
    spec reference and whether the file is GENERATED / VENDOR-SUPPLIED / HAND-WRITTEN in production.
12. Follow the conventions checklist in PLAN.md §8.3 (`<Ma>_<Api>`, `Std_ReturnType`, platform types,
    `<Ma>_ConfigType` + `<Ma>_Init`, MemMap START/STOP pairs, compiler abstraction macros, DET
    for development errors, DEM for production errors, version macros, `MainFunction`s scheduled
    and not called from ISRs, SWCs never include MCAL headers). `tools/check-autosar.py` must pass.
13. The FreeRTOS-based `Os-shim` is always labelled as **not an AUTOSAR OS**.

### Code shown on the site
14. **Never hand-paste code into a page.** Use
    `<script type="text/plain" data-src="examples/…" data-region="name" data-lang="c" data-file="main.c" id="src-…"></script>`
    and run `python3 tools/embed-code.py`. CI runs `--check`.
15. Prefer named regions (`// [region:clock]` … `// [endregion]`) over line ranges.
16. Annotation markers sit at line end inside a comment: `// «3»` (C), `@ «3»` (asm),
    `/* «3» */` (ld), `# «3»` (CMake/tcl/robot). Notes go in the page script as
    `NOTES = { 3: ["Title", "html explanation"] }`.
17. "Bad" code in bad-vs-good comparisons must also compile (warnings allowed only where noted).
18. Firmware style: C11, `-Wall -Wextra -Werror` for our code, `.clang-format` in repo, CMSIS device
    header names (`RCC->CFGR`, `RCC_CFGR_SW_PLL`), no dynamic allocation, no recursion, fixed-width
    types (`uint32_t`) outside AUTOSAR BSW (which uses `uint32` etc.).

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
  (practical shortcut), `warn` (can damage hardware, lock you out, or silently break).
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
| Data file | `site/assets/js/data/<subject>.js`, exported on `window.MCU_DATA.<key>` | `MCU_DATA.bluepill` |
| DOM ids for diagrams | `<kind>-<topic>` | `#clk-tree`, `#seq-irq-entry`, `#reg-rcc-cfgr` |
| Embedded source ids | `src-<example>-<region>` | `src-00-clock` |
| CSS component classes | short prefix per engine | `.pin-*`, `.reg-*`, `.clk-*`, `.wv-*`, `.mm-*` |
| localStorage keys | `mcu-` prefix, always wrapped in try/catch | `mcu-theme`, `mcu-code-lang`, `mcu-os`, `mcu-done-<page>` |
| Example folder | `examples/NN-kebab-name/` (NN two digits, catalog order) | `examples/05-adc-pot-dma/` |
| Example targets | `NN-kebab-name.elf/.hex/.bin`; CMake targets `flash`, `renode` | |
| Robot test | `examples/NN-…/test/NN.robot`; Renode script `renode/NN.resc` | |
| Images | `site/assets/img/<page-id>-<what>.webp`, ≤ 150 KB, with `alt` text | `setup-swd-wiring.webp` |
| Reference keys (`R`) | camelCase, doc-oriented | `rm0008Rcc`, `ds5319Pins`, `swsDio` |

## How to add a new module

1. **Check PLAN.md §3**: the module's id, number, group, sections and design sheet row. If you need
   to deviate, update PLAN.md in the same change.
2. Scaffold: `python3 tools/new-module.py <id>`. It creates `site/<id>.html` from the page template,
   `site/assets/js/pages/<id>.js`, a `SITE` entry stub and a `REFS` stub in `core.js`.
3. Fill the `SITE` entry: `num, group, title, short, icon, accent, desc`, and `sections` as
   `[id, title, search keywords]`. Keywords: lowercase, include register names and synonyms.
4. Write the page: `header.page-hero` (crumbs, eyebrow "Module NN · <Group>", `h1`, `.lead`,
   `.page-meta` with read time, level and main example), then one `section.doc-section[id][data-title]`
   per `SITE` section with `.sec-head h2 .sec-num`. Keep ids identical to `SITE`.
5. Example code: write or extend the example in `examples/` first, make it build
   (`cmake --preset bluepill-debug && cmake --build --preset bluepill-debug`), add regions and «n»
   markers, run its Robot test, then embed it with `tools/embed-code.py`.
6. Diagrams: use an existing engine with a data object. Only write a new engine if PLAN.md §9 has
   one planned; otherwise propose it in PLAN.md first.
7. References: add `R` entries (`{ t, url, doc, rev, sec, kind }`) and list them in `REFS[<id>]`.
8. Glossary: add every new term to `glossary-data.js` (`{term, cat, full, desc}`); diagram tooltips
   pick them up automatically.
9. Run the local checks:
   `python3 tools/embed-code.py --check && python3 tools/check-site.py && node --test tests/site/`
   and open the page through a local server (`python3 -m http.server -d site`) in both themes and at
   mobile width. Expect zero console errors.
10. Commit with a message like `module 05 gpio: sections model…swj, example 01 regions`.

## How to add a new example
1. `examples/NN-name/` with `README.md` front matter (`id, title, modules, peripherals, flavor, sim, hw, tested_on`),
   `CMakeLists.txt` (use `examples/common/cmake/bluepill.cmake`), `src/`, `expected-output.txt`,
   `wiring.svg` (export from the pinout engine), `renode/NN.resc` + `test/NN.robot` if simulatable,
   `test/` host tests if there is pure logic.
2. Use `examples/common/` (startup, linker, BSP, OpenOCD cfgs, Renode overlay). Don't copy them,
   except example 00, which owns its startup + linker on purpose for teaching.
3. Add the example to the catalog: `python3 tools/gen-catalog.py`.
4. Validate it on real hardware before marking `tested_on`.

## Local commands (once Phase 1–2 exist)
```sh
python3 -m http.server -d site 8000                      # preview the site
cmake --preset bluepill-debug -S examples/00-bluepill-blink-uart/bare && cmake --build --preset bluepill-debug
cmake --build build --target flash                       # OpenOCD + bluepill.cfg
renode-test examples/00-bluepill-blink-uart/bare/test/00.robot
cmake --preset host-tests && ctest --preset host-tests
python3 tools/embed-code.py && python3 tools/check-site.py
```

## Git
- Work on the branch you are given. Commit small, coherent steps. Don't commit build outputs
  (`build/`, `*.elf` outside CI artifacts).
- Generated-and-committed files (`site/assets/data/memmap/*.json`, embedded code in HTML,
  `examples/README.md`) are regenerated by their tool, never edited by hand.
