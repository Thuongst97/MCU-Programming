# MCU Academy — Implementation Plan

> A static, interactive learning site that takes a software engineer from "what is a microcontroller?"
> to AUTOSAR-structured automotive firmware, with every example running on one cheap board:
> the **STM32F103C8T6 "Blue Pill"** programmed through an **ST-Link V2** over SWD.

Status: **Phase 1 (site foundation) implemented 2026-10-24** (see §11.2). All former open questions are
decided (§12.2). No lesson content or example firmware yet; that starts in Phase 2.
Companion file: [`CLAUDE.md`](CLAUDE.md) (rules for future authoring sessions).

---

## 0. Executive summary

- **Shape:** a sibling of `Android-Knowledge/aaos14-academy`: zero-build static HTML, one CSS file,
  vanilla JS runtime with a `SITE` array, GitHub Pages deploy with `__BUILD__` cache busting.
  Runtime keeps its features. The CSS gets consolidated into one token layer instead of being copied as-is.
- **New engines:** Blue Pill pinout viewer, register/bit-field viewer, clock-tree configurator,
  waveform renderer (UART/SPI/I2C/PWM/CAN), memory-map/linker visualizer, generic state machine,
  bad-vs-good code comparison and a "you are done when…" checklist. The AUTOSAR explorer and the
  signal-flow walkthrough reuse the existing layered renderer and sequence engine.
- **Code on the site is never hand-pasted.** It lives in `examples/`, compiles in CI, and gets
  inlined into pages by `tools/embed-code.py`. CI fails if a page drifts from the source.
- **26 modules in 6 groups + 5 reference pages** (incl. a short LL-drivers appendix). MVP = landing page + Module 02 "Setting Up and
  Running a Program on STM32F103C8T6 Blue Pill" + Troubleshooting + Board reference, with examples
  00–02 building in CI and running in Renode.
- **AUTOSAR honestly:** AUTOSAR Classic **R25-11** (latest release; R24-11 is superseded) is the
  pinned spec for every citation. MCAL, RTE and BSW-lite are hand-written to SWS API signatures. Every
  file is labelled *generated-in-production* or *hand-written-in-production*. An "In production (R4.x)"
  box appears wherever real ECUs differ. R26-11 becomes a review milestone, not an automatic re-pin.
- **Simulator:** Renode 1.17.0 is the only viable no-hardware path. It needs a project-owned
  platform overlay, because the stock `stm32f103.repl` has no RCC model. That would hang a naive
  PLL-switch loop. QEMU is not an option (see §7.4).
- **Decided stack (§12.2):** plain registers through the CMSIS device header, C startup, CMake + Ninja
  only, Unity (+ CMock) on CTest, a Playwright smoke test in CI, MIT for code and CC BY 4.0 for prose,
  Actions pinned by SHA with Dependabot, and third-party code vendored into `third_party/`.

---

## 1. Findings from the reference repo (`Thuongst97/Android-Knowledge`)

I studied `aaos14-academy/` at commit `0ac7026`. It has 13 pages, `assets/css/main.css` (121 KB),
`assets/js/core.js` (58 KB), `diagrams.js` (34 KB), `glossary-data.js` and 14 page scripts, plus
`tools/hero-art.py` and `.github/workflows/pages.yml`.

### 1.1 Your points, verified

| Your statement | Verdict | Detail |
|---|---|---|
| No site generator; static HTML + one CSS + vanilla JS | ✅ | No package.json, no bundler. Pages load `glossary-data.js → core.js → diagrams.js → pages/*.js` with `?v=__BUILD__`. |
| `pages.yml` stamps `__BUILD__` with commit SHA | ✅ | `sed -i "s/__BUILD__/${GITHUB_SHA::8}/g" aaos14-academy/*.html`, then a guard `! grep -l "__BUILD__"`. Runs on push to `main` + manual dispatch only. The site folder is the Pages artifact root. |
| `core.js` owns `SITE` (id, file, num, group, title, short, icon, accent, desc, sections) | ✅ | `sections` entries are `[id, title, keywords]` tuples. |
| …renders header, sidebar, pager, footer, search, scrollspy, tabs, highlighter, annotated code viewer, sequence engine | ✅ | Exported as `window.AAOS = { SITE, $, $$, esc, norm, slug, initTabs, tokenize, toLines, codeBlockHTML, parseMarks, renderCodeExplorer, renderStaticCode, wireCopy, SequenceDiagram }`. |
| `diagrams.js` + per-page scripts | ✅ | `diagrams.js` exports `AAOS.Diagram` (primitives `box/row/chips/label/note/pill/arrow/pin/defs/svg/attachPulse`, `termTip`, and the **layered architecture renderer** `D.layered(host, spec)`) and `AAOS.Cabin`. |
| `glossary-data.js` feeds `glossary.html` | ✅ (and more) | `window.GLOSSARY = [{term, cat, full, desc}]`. It **also feeds global search and diagram tooltips** (`termTip` falls back to the glossary). |
| Dark/light theme persisted in `localStorage` | ✅ | Key `aaos-theme`. Dark is the default, light follows `prefers-color-scheme` unless forced. An inline `<head>` script applies the stored theme before first paint, so pages don't flash. |
| `tools/hero-art.py` generates the hero SVG from CSS color tokens | ⚠️ partly | The script **does not read CSS**. It emits SVG whose fills reference `--hv-*` custom properties, so one SVG works in both themes. Its output is **pasted by hand** into `index.html` (`python3 tools/hero-art.py > art.svg`). Nothing regenerates it in CI. |
| Landing pattern: hero+stats → path → module grid from `SITE` → features → 30-second model + analogy → CTA | ✅ | The hero also has a clickable **layer stack** (`.hero-stack`, five links into the architecture page) beside the art. |
| Teaching style: interactive diagram + annotated code + analogy + official sources | ✅ | Callout types in use: `analogy` (18), `warn` (12), `tip` (11), `note` (6). |

### 1.2 Things you didn't list

1. **Official references system.** `core.js` holds a dictionary `R = {key: [title, url]}` and a
   per-page map `REFS = {pageId: [keys…]}`. `renderReferences()` auto-appends "Official references"
   as the page's last **numbered** section (for example 4.6), just before the pager. The MCU site keeps
   this and extends it (§9.9).
2. **Tooltips everywhere.** Any element with `data-tip="Term — explanation"` gets a styled tooltip
   on hover and focus. Diagram nodes get tips automatically from a `TERMS` map in `diagrams.js`,
   which falls back to the glossary.
3. **Language switch.** A `.lang-switch` wrapper around several code blocks becomes a tab bar.
   The choice applies to every block on the page and is remembered (`aaos-code-lang`). **The MCU
   site reuses this for "Registers ⇄ HAL" variants of the same code.**
4. **Code source convention.** Raw code sits in `<script type="text/plain" id="src-…">` blocks with
   trailing `«n»` markers. The page script holds a `NOTES = {n: [title, html]}` object and calls
   `renderCodeExplorer`. Static blocks use `<script type="text/plain" data-code data-lang data-file>`.
5. **Highlighter languages:** `kotlin, java, cpp, aidl, xml, conf`. **No C, assembly, linker script,
   CMake or shell.** The MCU site needs all of those (§9.1).
6. **Sidebar extras:** reading-progress bar, and a filter that searches the **full text** of the
   current page's sections plus other pages' keywords. Global search opens with `Ctrl/⌘ K` or `/`
   and includes glossary entries.
7. **Soft breaks** inside inline `<code>`: long identifiers (`RCC_APB2ENR_IOPCEN` is a good test) wrap
   only after `_ . / ( ::`. A `MutationObserver` covers dynamically rendered content.
8. **Accessibility:** `prefers-reduced-motion` disables pulses, tabs support arrow keys, sequence
   diagrams support `← → Space R`, and diagrams carry ARIA labels.
9. **Hard-coded bits** that must become data-driven in the fork: header nav links (Architecture /
   Users / Code / …), the footer link list and its "AOSP `android-14.0.0`" disclaimer, the brand mark
   "A14", and the search placeholder.
10. **CSS has accumulated layers:** "Diagram system v2", "v4", "Layer tones", and several separate
    light-theme override blocks (`:root[data-theme="light"]` + `@media (prefers-color-scheme: light)`
    duplicated 6+ times). Copying it verbatim would carry that debt. **Recommendation:** consolidate
    into one token block per theme before adding MCU components (§2.2).
11. **No PR-time checks at all.** No link check, no HTML validation, no `SITE`↔page consistency check.
    The MCU site needs them because it also has compiled code (§10).
12. **Page anatomy** (copy exactly): `body[data-page]` → `#site-header` → `.layout` →
    `aside#sidebar` + `main.content > .content-inner` → `header.page-hero` (crumbs, eyebrow, `h1`,
    `.lead`, `.page-meta`: read time · level · source path) → `section.doc-section[id][data-title]`
    with `.sec-head h2 .sec-num "4.1"` → `#pager` → `#site-footer`.
13. Unrelated files sit at the repo root (`config.txt` is a Raspberry Pi config, plus `resolution.txt`). The MCU repo should
    keep its root clean.

### 1.3 Reuse / adapt / new

| Area | Reuse as-is | Adapt | New |
|---|---|---|---|
| Layout runtime (header, sidebar, pager, footer, search, scrollspy, tabs, tooltips, soft breaks) | ✅ logic | Namespace `window.AAOS` → `window.MCU`. Nav links + footer from a `NAV` config. Brand "MCU Academy · Automotive Firmware Handbook", mark "F1". Search placeholder "Search: NVIC, CAN_BTR, Rte_Write…". | **`strings.js`**: every UI string (nav labels, placeholders, button labels, pager, footer, engine labels) lives in one `window.MCU_STRINGS` object, so a translation is possible later without i18n infrastructure (D10). |
| Theme | ✅ mechanism | Storage keys `mcu-theme`, `mcu-code-lang`. New accent palette (§2.2). | — |
| References (`R` / `REFS`) | ✅ | Each entry gains a doc ID + revision + section: `[title, url, {doc:"RM0008", rev:"21", sec:"7.3.2"}]`, rendered as a badge. | Source kinds: `st`, `arm`, `autosar`, `iso`, `tool`, `community` (community sources get a visible "community" badge). |
| Highlighter | ✅ tokenizer | — | Languages `c`, `asm` (GNU as, Thumb-2), `ld`, `cmake`, `sh`/`console`, `tcl` (OpenOCD), `resc`/`repl` (Renode), `robot`, `arxml` (= xml), `yaml`, `json`. |
| Annotated code viewer | ✅ | `parseMarks` also strips **comment-wrapped** markers (`// «3»`, `/* «3» */`, `@ «3»`, `# «3»`) so markers can live in real, compiling source. Supports `data-src` + `data-lines` (§9.8). | "View on GitHub" and "Download example" links per block. |
| Sequence engine | ✅ | Legend labels configurable per diagram (`call / irq / dma / bus / ret` instead of Binder IPC). | — |
| Layered renderer `D.layered` | ✅ | The "Treble" band type generalises to a "boundary band" (used for the **RTE** line and the **MCAL ↔ hardware** line). Tone map for AUTOSAR layers. | AUTOSAR BSW explorer spec (§9.6). |
| Cabin topology | ✗ drop | — | Replaced by the Blue Pill board viewer. |
| Glossary | ✅ | Categories: `core, memory, toolchain, debug, peripheral, bus, rtos, autosar, diag, safety, quality`. | — |
| Landing pattern | ✅ | Hero title stays board-agnostic ("MCU Academy"); the **hero subtitle states the focus**: "Every example runs on an STM32F103C8T6 Blue Pill and a ST-Link V2" (D1). Hero stack = the 5 AUTOSAR-ish layers (App SWC · RTE · BSW services · ECU abstraction · MCAL), each linking into a module. | 30-second model: "reset → vector table → `Reset_Handler` → `main` → peripherals via registers". |
| Hero art | concept only | `tools/hero-art.py` re-written with the same iso helpers (`P`, `plane`, `box`). | **Concept:** an isometric Blue Pill PCB (yellow BOOT jumpers, PC13 LED glowing, 4-pin SWD header with an ST-Link cable) with translucent panes above it for the software layers, and a light column rising from the MCU die through MCAL → RTE → SWC. A second Blue Pill sits behind it, linked by a twisted-pair CAN cable through two SN65HVD230 modules. |
| CI | ✅ stamping step | Artifact root `site/`. Examples copied to `_site/examples/`. | Build, host tests, Renode tests, static analysis, embed check, link check (§10). |

---

## 2. Repository layout

```
MCU-Programming/
├── README.md                     # what this is, how to preview locally, how to build examples
├── PLAN.md  CLAUDE.md
├── LICENSE                       # MIT: all code (examples/, autosar/, capstone/, tools/, tests/, site JS/CSS)
├── LICENSE-CONTENT               # CC BY 4.0: prose and diagrams on the site (D9)
├── CMakePresets.json             # presets: bluepill-debug, bluepill-release, host-tests
├── .clang-format  .editorconfig  .gitignore   # .gitignore: build/, .cache/ (downloaded SVD), node_modules/
├── .github/
│   ├── dependabot.yml            # weekly: github-actions + npm (tests/site) (D9)
│   └── workflows/                # every action pinned by full commit SHA + "# vX.Y.Z" comment
│       ├── ci.yml                # PR + push: examples, host tests, renode, static analysis, site checks, browser smoke
│       ├── pages.yml             # push to main: stamp __BUILD__, assemble _site, deploy
│       └── links-weekly.yml      # scheduled external link check (non-blocking)
├── site/                         # ← deployed to GitHub Pages (artifact root)
│   ├── index.html
│   ├── fundamentals.html  setup.html  boot.html  clocks.html  gpio.html  interrupts.html
│   ├── timers.html  uart.html  adc-dma.html  i2c.html  spi.html  can.html  power-wdg.html
│   ├── rtos.html  faults-debug.html  bootloader.html  quality.html
│   ├── autosar-arch.html  autosar-swc.html  autosar-mcal.html  autosar-os-com.html
│   ├── autosar-diag-nvm.html  autosar-review.html
│   ├── capstone-baremetal.html  capstone-rtos.html  capstone-autosar.html
│   ├── board.html  troubleshooting.html  automotive-mcus.html  ll-drivers.html  glossary.html
│   ├── assets/css/main.css
│   ├── assets/js/strings.js      # every UI string in one place (window.MCU_STRINGS), loaded first
│   ├── assets/js/lib/code.js     # pure tokenizer / «n» markers / line numbers (UMD: browser + node tests)
│   ├── assets/js/core.js  diagrams.js  glossary-data.js
│   ├── assets/js/engines/        # pinout.js regview.js clocktree.js waveform.js memmap.js
│   │                             # statemachine.js compare.js checklist.js calc.js
│   ├── assets/js/data/           # bluepill-pins.js, regs-stm32f103.js (hand-authored from RM0008, §2.4), autosar-bsw.js
│   ├── assets/js/pages/          # one file per page that needs custom wiring
│   ├── assets/js/data/memmap/    # generated per-example memory maps (JS, committed, CI-checked)
│   └── assets/img/               # photos of real wiring (WebP, ≤150 KB each), favicon
├── examples/
│   ├── README.md                 # catalog table (generated by tools/gen-catalog.py)
│   ├── common/
│   │   ├── cmake/arm-none-eabi.cmake      # toolchain file
│   │   ├── cmake/bluepill.cmake           # flags, linker script, size/hex/bin post-build, flash target
│   │   ├── ld/stm32f103c8_64k.ld          # FLASH 64K, RAM 20K (never 128K)
│   │   ├── startup/startup_stm32f103.c    # C startup + vector table (shared from example 01 on)
│   │   ├── bsp/                           # clock.c (HSI/HSE/PLL), led.c, uart_log.c, delay.c
│   │   ├── openocd/bluepill.cfg           # interface stlink + target stm32f1x + FLASH_SIZE 0x10000
│   │   ├── openocd/bluepill-clone.cfg     # same + CPUTAPID 0x2ba01477
│   │   └── renode/bluepill.repl           # overlay on platforms/cpus/stm32f103.repl (§7.3)
│   ├── 00-bluepill-blink-uart/
│   │   ├── README.md  wiring.svg  expected-output.txt
│   │   ├── bare/                 # CMakeLists.txt, src/main.c, src/startup.c (C), ld/…, renode/00.resc, test/00.robot
│   │   ├── hal/                  # CubeMX .ioc + generated CMake project incl. its Drivers/ (HAL, BSD-3, licence files kept)
│   │   └── ll/                   # tiny LL variant for Appendix D; reuses hal/Drivers LL headers
│   ├── 01-exti-button-debounce/ …  12-uart-bootloader/   (catalog §5)
│   └── 13-lin-two-nodes/         # optional, late phase (Phase 8), not part of the MVP (D6)
├── capstone/turnlight/
│   ├── docs/requirements.md  architecture.md  can-matrix.md  acceptance-tests.md
│   ├── stage1-baremetal/  stage2-freertos/  stage3-autosar/
│   └── cluster-node/             # firmware for the second Blue Pill
├── autosar/                      # hand-written AUTOSAR-style library shared by capstone stage 3
│   ├── include/Std_Types.h  Platform_Types.h  Compiler.h  Compiler_Cfg.h  MemMap.h
│   ├── mcal/{Mcu,Port,Dio,Pwm,Adc,Gpt,Wdg,Can}/      # each: <Ma>.h <Ma>.c <Ma>_Cfg.h <Ma>_PBcfg.c
│   ├── ecual/{IoHwAb,CanIf,WdgIf}/
│   ├── services/{Det,Dem,Com,PduR,EcuM,WdgM,NvM,Fee,Dcm}/   # deliberately reduced ("-lite"), labelled
│   ├── os_shim/                  # OSEK/AUTOSAR-OS-like API over FreeRTOS: NOT an AUTOSAR OS (§8.2)
│   ├── rte/                      # hand-written RTE that mirrors generated code
│   └── arxml/                    # minimal SWC/interface descriptions used by tools/rte-gen (Phase 6+)
├── third_party/                  # vendored, pinned, never edited in place; no submodules (§2.3, D12)
│   ├── README.md                 # table: component · version · upstream URL · commit · licence · update command
│   ├── cmsis_core/               # ARM-software/CMSIS_6 — CMSIS/Core/Include only (Apache-2.0)
│   ├── cmsis_device_f1/          # STMicroelectronics/cmsis-device-f1 — Include/ only (Apache-2.0)
│   ├── freertos_kernel/          # FreeRTOS/FreeRTOS-Kernel — core + portable/GCC/ARM_CM3 + MemMang/heap_4 (MIT)
│   ├── unity/                    # ThrowTheSwitch/Unity — src/ (MIT)
│   └── cmock/                    # ThrowTheSwitch/CMock — added only when the first test needs mocks (MIT)
├── tests/site/                   # site tests (the only npm usage in the repo)
│   ├── package.json  package-lock.json  playwright.config.mjs   # @playwright/test, exact version
│   ├── *.test.mjs                # node --test: lib/code.js now; engine math (CRC-15, bit timing, clock tree, BRR) later
│   ├── smoke.spec.mjs            # Playwright: every page loads, zero console errors, both themes, links, engines
│   └── fixtures/engines.html     # test-only page rendering every engine with sample data (not deployed)
├── tests/tools/test_tools.py     # unittest: embed-code, check-regs, check-site, new-module (incl. negative cases)
├── docs/                         # project docs, not deployed
│   ├── spikes.md                 # Phase-0 findings
│   ├── beta-feedback-template.md # §11.1
│   └── autosar-self-review.md    # Phase-6 log: one row per AUTOSAR rule/API shown on the site (§8.5)
└── tools/
    ├── versions.json             # single source of truth for every pinned tool version (§6.1)
    ├── hero-art.py               # iso hero SVG (paste into site/index.html, as in the reference)
    ├── embed-code.py             # inline examples/ sources into site pages; --check mode for CI
    ├── check-site.py             # SITE ↔ HTML ids, REFS completeness, assets exist, no TODO, sizes
    ├── elf2memmap.py             # ELF → site/assets/js/data/memmap/<example>.js (uses arm-none-eabi-readelf/nm)
    ├── check-regs.py             # cross-checks hand-authored register data against third_party/cmsis_device_f1 (_Pos/_Msk, base addresses)
    ├── fetch-svd.py              # downloads STM32F103.svd into .cache/svd/ for Cortex-Debug (not committed, §2.4)
    ├── update-third-party.py     # re-vendors one component at a tag: copies the subset, LICENSE, rewrites README + versions.json
    ├── gen-catalog.py            # examples/*/README front-matter → examples/README.md + site data
    ├── new-module.py             # scaffold page html + page js from the SITE entry, flip status to "ready", add REFS stub
    ├── templates/                # module.html, section.html, page.js used by new-module.py
    ├── autosar-ids.txt           # every SWS_/SRS_ ID cited, with document · section · date read (§8.5)
    └── rte-gen/                  # (Phase 6, optional) tiny ARXML-subset → Rte_<Swc>.h generator
```

### 2.1 Why `site/` and not `mcu-academy/`

A neutral folder name keeps URLs short (`…github.io/MCU-Programming/setup.html`). It also leaves
room for `examples/`, `autosar/` and `capstone/` beside it. `pages.yml` copies `site/` to `_site/`
and adds `examples/` so pages can link to raw sources and downloadable folders. (Decided: D1.)

### 2.2 Visual identity (adapt)

- Keep the dark "graphite" base and glass cards so the two sites read as siblings.
- **New accent palette** (MCU-flavoured): `--accent-copper #e8a36b` (PCB copper, primary),
  `--accent-solder #c9d1d9` (silver), `--accent-mask #3fb68b` (solder-mask green),
  `--accent-signal #60a5fa` (signals/buses), `--accent-amber #fbbf24` (warnings, hardware
  boundary). Module accents are drawn from these, plus purple `#a78bfa` for AUTOSAR.
- Layer tones for AUTOSAR diagrams: `asw` blue · `rte` amber · `svc` green · `ecual` teal ·
  `mcal` purple · `cdd` pink · `hw` copper.
- Consolidation rule: one `:root` dark block, one `:root[data-theme="light"]` block, and one
  `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {…} }` block. No other
  file may redefine tokens.

### 2.3 Third-party code policy (D12)

- Everything the firmware or tests compile from outside this repo is **vendored** into `third_party/`,
  so a GitHub ZIP download builds offline with no extra steps. There are no git submodules and no
  CMake `FetchContent`.
- Each component folder holds the upstream **LICENSE** file unchanged and a `README.md` with the upstream
  URL, tag, full commit SHA, the subset copied, and the update command.
- Only the needed subset is vendored (headers for CMSIS; `portable/GCC/ARM_CM3` + `MemMang/heap_4.c` for
  FreeRTOS; `src/` for Unity). Files are never edited in place. Project-specific config
  (`FreeRTOSConfig.h`, `unity_config.h`) lives next to the example that uses it.
- `tools/update-third-party.py <component> <tag>` re-vendors a component, rewrites its README and
  `tools/versions.json`, and prints the diff summary. CI checks that every folder has LICENSE + README
  and that versions match `versions.json`.
- Exception: the HAL used by `00-bluepill-blink-uart/hal/` stays inside that folder exactly as CubeMX
  generated it, with ST's licence files, because the point of that path is to show what the vendor
  tool produces.

### 2.4 SVD and register data (D8)

Licence check (2026-10-24, from the two public GitHub copies; st.com itself was not reachable):

| Source | Licence found | Notes |
|---|---|---|
| `cmsis-svd/cmsis-svd-data` → `data/STMicro/STM32F103xx.svd` (SVD v1.3) | **ST "End User License Agreement" (Version 1.0)** in `data/STMicro/License.html`: non-transferable licence to use and copy only for developing development tools or for "derivative representations" to develop and debug software for ST devices | Restrictive and purpose-limited |
| `modm-io/cmsis-svd-stm32` → `stm32f1/STM32F103.svd` (SVD v1.1, F1 package v1.2) | Repo README says the SVDs are "licensed as Apache-2.0", downloaded from ST's homepage; repo `LICENSE.md` is Apache-2.0 | The SVD file itself has **no licence header**, and the claim contradicts the ST EULA above |
| ST CMSIS pack (`Keil.STM32F1xx_DFP`) / st.com download | not checked (st.com blocked by this session's network policy) | |

**Result: unclear, so the SVD is not committed.** Instead:
1. `tools/fetch-svd.py` downloads it in the setup step into `.cache/svd/STM32F103.svd` (gitignored),
   with a checksum pinned in `tools/versions.json`. It tries ST's download first and the modm-io copy at a
   pinned commit as a fallback. The setup page tells learners to run it and why it isn't in the repo.
   Cortex-Debug's `svdFile` points there.
2. The site's register viewer data (`regs-stm32f103.js`) is **hand-authored from RM0008** for only the
   registers we actually teach, with field descriptions in our own words and RM0008 section numbers.
   `tools/check-regs.py` verifies every address, bit position and width against the Apache-2.0
   `stm32f103xb.h` from cmsis-device-f1, so the hand-authored data can't drift from ST's headers.
3. Revisit if ST's own download page states Apache-2.0 for the F1 SVD. Then vendor it into
   `third_party/svd/` with attribution and keep the hand-authored descriptions.

---

## 3. Curriculum (`SITE` array)

Levels map to `group`. The array below is the planned `SITE` content, written in the same shape as
the reference. Section ids are final, so later sessions should not rename them, because global search and
deep links depend on them.

```js
const SITE = [
  /* ───────────── Group: Start here ───────────── */
  { id: "fundamentals", file: "fundamentals.html", num: "01", group: "Start here",
    title: "What Is a Microcontroller?", short: "MCU Fundamentals", icon: "🧠", accent: "#e8a36b",
    desc: "MCU vs MPU, the Cortex-M3 core, buses, memory map, registers and how C becomes bits on a pin.",
    sections: [
      ["mcu-vs-mpu", "MCU vs MPU vs SoC", "microcontroller microprocessor soc ecu linux bare metal"],
      ["inside-f103", "Inside the STM32F103C8T6", "cortex-m3 72 mhz 64 kb flash 20 kb sram ahb apb bus matrix"],
      ["memory-map", "The memory map", "0x08000000 0x20000000 0x40000000 peripheral region system memory bit-band"],
      ["registers", "Registers and volatile", "register volatile memory-mapped io read-modify-write bit mask"],
      ["cortex-m3", "The Cortex-M3 core", "thumb-2 r0-r15 msp psp xpsr nvic systick armv7-m"],
      ["toolchain", "From C to flash", "compiler assembler linker elf hex bin objcopy arm-none-eabi-gcc"],
      ["takeaways", "Key takeaways", "summary"],
    ] },
  { id: "setup", file: "setup.html", num: "02", group: "Start here",
    title: "Setting Up and Running a Program on STM32F103C8T6 Blue Pill", short: "Setup & First Program", icon: "🔌", accent: "#3fb68b",
    desc: "Wire an ST-Link, install the toolchain on Windows/Linux/macOS, build two ways, blink PC13, switch to 72 MHz, print over UART, debug, and run it in Renode.",
    sections: [
      ["bom", "Bill of materials", "blue pill st-link v2 jumper wires usb uart adapter ch340 cp2102"],
      ["wiring", "Wiring SWD and BOOT jumpers", "swdio swclk 3.3v gnd boot0 boot1 pa13 pa14 jumper"],
      ["install", "Install the environment", "arm gnu toolchain cmake ninja openocd vs code cortex-debug st-link driver udev"],
      ["verify", "Verify every tool", "version check arm-none-eabi-gcc --version openocd -v st-info"],
      ["paths", "Two build paths compared", "stm32cubeide cubemx hal bare metal cmake registers"],
      ["path-cube", "Path A: STM32CubeIDE + HAL", "cubemx ioc hal_gpio_togglepin generated code"],
      ["path-bare", "Path B: bare-metal CMake from scratch", "startup vector table linker script systeminit reset_handler"],
      ["cmake-under-hood", "What CMake generates under the hood", "cmake ninja build.ninja toolchain file compile_commands.json gcc flags"],
      ["blink", "Blink PC13 (active-low)", "pc13 led active low gpioc crh odr bsrr"],
      ["clock-72", "From HSI 8 MHz to PLL 72 MHz", "hse pll x9 flash latency wait states rcc_cfgr sws"],
      ["uart-hello", "\"Hello from Blue Pill\" over USART1", "usart1 pa9 pa10 brr 115200 usb uart"],
      ["flash", "Flash with OpenOCD and CubeProgrammer", "openocd program verify reset stm32cubeprogrammer cli"],
      ["debug", "Debug: breakpoints, stepping, SVD", "cortex-debug gdb breakpoint step watch svd peripheral registers"],
      ["renode", "Run without hardware in Renode", "renode simulation resc repl uart analyzer robot"],
      ["done", "You are done when…", "checklist"],
    ] },

  /* ───────────── Group: From reset to main ───────────── */
  { id: "boot", file: "boot.html", num: "03", group: "From reset to main",
    title: "Startup Code, Vector Table & Linker Scripts", short: "Startup & Linker", icon: "🚀", accent: "#e8a36b",
    desc: "What happens between reset and main(): boot modes, vector table, .data/.bss init, linker script sections and map files.",
    sections: [
      ["boot-modes", "Boot modes: BOOT0 and BOOT1", "boot0 boot1 pb2 system memory bootloader sram boot"],
      ["reset-sequence", "The reset sequence", "initial sp reset vector reset_handler msp"],
      ["vector-table", "The vector table", "isr_vector weak alias default_handler vtor"],
      ["sections", ".text, .data, .bss, stack and heap", "text rodata data bss stack heap lma vma"],
      ["linker-script", "Writing the linker script", "memory sections origin length > at> provide _estack align"],
      ["memmap-viz", "Memory-map visualizer", "map file size readelf nm"],
      ["c-vs-asm", "Startup in C vs ST's assembly", "startup_stm32f103xb.s c startup comparison"],
      ["pitfalls", "Pitfalls", "64k vs 128k estack alignment 8-byte aapcs"],
    ] },
  { id: "clocks", file: "clocks.html", num: "04", group: "From reset to main",
    title: "Clocks: RCC, HSE, PLL and Flash Wait States", short: "Clock Tree", icon: "⏱️", accent: "#fbbf24",
    desc: "The STM32F1 clock tree end to end, why 72 MHz needs two flash wait states, and how every peripheral clock is derived.",
    sections: [
      ["why-clocks", "Why clocks matter", "clock frequency power timing"],
      ["sources", "Clock sources", "hsi hse lsi lse 8 mhz crystal css"],
      ["clock-tree", "Interactive clock tree", "pll pllmul pllsrc ahb apb1 apb2 prescaler adcpre usbpre"],
      ["flash-latency", "Flash wait states and prefetch", "flash_acr latency prftbe 48 mhz 72 mhz"],
      ["switching", "Switching clocks safely", "hserdy pllrdy sw sws timeout"],
      ["peripheral-clocks", "Peripheral clock enables", "rcc_apb2enr rcc_apb1enr rcc_ahbenr"],
      ["mco", "Measuring the clock (MCO on PA8)", "mco pa8 oscilloscope"],
    ] },
  { id: "gpio", file: "gpio.html", num: "05", group: "From reset to main",
    title: "GPIO and Alternate Functions", short: "GPIO & AFIO", icon: "📍", accent: "#3fb68b",
    desc: "CRL/CRH modes, ODR vs BSRR, pull-ups, 5 V tolerance, AFIO remapping and how not to lock yourself out of SWD.",
    sections: [
      ["model", "The F1 GPIO model", "crl crh mode cnf input output analog floating pull-up"],
      ["reg-viewer", "Configure a pin bit by bit", "register viewer gpiox_crl gpiox_crh"],
      ["write-read", "ODR, BSRR, BRR and IDR", "atomic set reset bsrr brr idr odr"],
      ["electrical", "Electrical limits", "5v tolerant ft sink source pc13 pc14 pc15 3 ma"],
      ["afio", "AFIO and remapping", "afio mapr remap alternate function"],
      ["swj", "SWJ_CFG: keeping SWD alive", "swj_cfg jtag disable pa13 pa14 pa15 pb3 pb4 lockout"],
      ["debounce", "Buttons and debouncing", "button bounce debounce pull-up"],
    ] },
  { id: "interrupts", file: "interrupts.html", num: "06", group: "From reset to main",
    title: "Interrupts, NVIC, EXTI and SysTick", short: "Interrupts & NVIC", icon: "⚡", accent: "#60a5fa",
    desc: "Exception model, NVIC priorities with 4 priority bits, EXTI line mapping, SysTick time base and safe sharing with main().",
    sections: [
      ["exceptions", "Exceptions vs interrupts", "exception irq hardfault nmi pendsv svc systick"],
      ["entry-exit", "What the core does on entry", "stacking exc_return tail chaining late arrival"],
      ["nvic", "NVIC priorities and grouping", "nvic priority grouping preemption subpriority 4 bits"],
      ["exti", "EXTI and AFIO_EXTICR", "exti line afio exticr rising falling edge pending"],
      ["systick", "SysTick time base", "systick reload 1 ms tick"],
      ["shared-data", "Sharing data with an ISR", "volatile atomic critical section primask race"],
      ["scheduler", "A non-blocking cooperative scheduler", "super loop cooperative scheduler tasks millis"],
    ] },
  { id: "timers", file: "timers.html", num: "07", group: "From reset to main",
    title: "Timers, PWM and Input Capture", short: "Timers & PWM", icon: "〰️", accent: "#a78bfa",
    desc: "General-purpose timers, prescaler/ARR math, PWM output compare, input capture and the APB1 ×2 timer-clock rule.",
    sections: [
      ["timebase", "Prescaler, ARR and update events", "psc arr cnt update uev"],
      ["timer-clock", "The ×2 timer clock rule", "apb1 prescaler timer clock 72 mhz x2"],
      ["pwm", "PWM with output compare", "pwm ccr ccmr oc mode duty"],
      ["pwm-wave", "Interactive PWM waveform", "duty cycle frequency waveform"],
      ["capture", "Input capture", "input capture period measure"],
      ["remap", "Timer pins and remaps", "tim2 tim3 tim4 partial remap pins"],
    ] },

  /* ───────────── Group: Peripherals ───────────── */
  { id: "uart", file: "uart.html", num: "08", group: "Peripherals",
    title: "USART: Frames, Interrupts and a Command Shell", short: "UART", icon: "💬", accent: "#60a5fa",
    desc: "UART framing, BRR math, interrupt-driven RX/TX with a lock-free ring buffer, and the USART LIN mode.",
    sections: [
      ["frame", "Anatomy of a UART frame", "start bit stop bit parity 8n1 waveform"],
      ["baud", "Baud rate and BRR", "brr mantissa fraction baud error calculator"],
      ["polling-irq", "Polling vs interrupts", "txe rxne tc interrupt"],
      ["ring-buffer", "A lock-free ring buffer", "ring buffer spsc head tail power of two"],
      ["shell", "A tiny command shell", "command line parser shell"],
      ["lin-mode", "LIN mode on the F1 USART", "lin break lbd lbdl linen"],
    ] },
  { id: "adc-dma", file: "adc-dma.html", num: "09", group: "Peripherals",
    title: "ADC and DMA", short: "ADC & DMA", icon: "🎚️", accent: "#e8a36b",
    desc: "12-bit SAR ADC, calibration, sampling time, scan mode, then DMA circular transfers that free the CPU.",
    sections: [
      ["sar", "How a SAR ADC works", "sar adc 12 bit successive approximation"],
      ["config", "Configuring ADC1", "adcpre 14 mhz smpr sqr calibration cal rstcal"],
      ["single", "Single conversion, polling", "swstart eoc dr"],
      ["dma", "DMA basics", "dma channel cpar cmar cndtr circular mem2mem"],
      ["adc-dma", "Scan + DMA circular", "scan mode dma circular half transfer"],
      ["noise", "Noise, averaging and Vrefint", "oversampling average vrefint temperature sensor"],
    ] },
  { id: "i2c", file: "i2c.html", num: "10", group: "Peripherals",
    title: "I2C and an SSD1306 OLED", short: "I2C", icon: "🖥️", accent: "#3fb68b",
    desc: "I2C protocol on the wire, the F1 I2C peripheral and its errata, then drawing on an SSD1306 OLED.",
    sections: [
      ["protocol", "I2C on the wire", "start stop ack nack address sda scl open drain pull-up"],
      ["waveform", "Interactive I2C transaction", "waveform start ack stop"],
      ["f1-i2c", "The F1 I2C peripheral", "i2c_cr1 cr2 ccr trise sr1 sr2 event sequence"],
      ["errata", "Errata you must know", "busy flag analog filter errata workaround"],
      ["ssd1306", "Driving the SSD1306", "ssd1306 oled framebuffer page addressing"],
    ] },
  { id: "spi", file: "spi.html", num: "11", group: "Peripherals",
    title: "SPI and a W25Qxx Flash", short: "SPI", icon: "🔁", accent: "#a78bfa",
    desc: "SPI modes (CPOL/CPHA), chip select discipline, and reading/writing a W25Qxx NOR flash.",
    sections: [
      ["modes", "SPI modes CPOL/CPHA", "cpol cpha mode 0 mode 3 waveform"],
      ["f1-spi", "The F1 SPI peripheral", "spi_cr1 br mstr ssm ssi txe rxne bsy"],
      ["cs", "Chip select discipline", "nss chip select gpio"],
      ["w25q", "Talking to a W25Qxx", "jedec id 0x9f read 0x03 page program erase status busy"],
      ["dma-spi", "SPI with DMA", "spi dma"],
    ] },
  { id: "can", file: "can.html", num: "12", group: "Peripherals",
    title: "CAN with bxCAN (and CAN FD, LIN in Theory)", short: "CAN & LIN", icon: "🚗", accent: "#fbbf24",
    desc: "CAN physical layer, frame format, arbitration, bit timing and filters, two Blue Pills over SN65HVD230, plus CAN FD and LIN concepts.",
    sections: [
      ["physical", "Physical layer and transceivers", "can_h can_l differential sn65hvd230 120 ohm termination"],
      ["frame", "The CAN frame", "sof id rtr ide dlc data crc ack eof bit stuffing"],
      ["arbitration", "Arbitration and errors", "arbitration dominant recessive error active passive bus off tec rec"],
      ["bit-timing", "Bit timing calculator", "can_btr brp ts1 ts2 sjw sample point 500 kbit"],
      ["bxcan", "The bxCAN peripheral", "bxcan init mode mailbox fifo inrq inak"],
      ["filters", "Acceptance filters", "filter bank mask list 32 bit"],
      ["usb-conflict", "Why CAN and USB can't run together", "usb can shared sram 512 byte"],
      ["two-nodes", "Two nodes on a real bus", "two blue pills loopback silent mode ack"],
      ["can-fd", "CAN FD in theory", "can fd brs edl 64 byte not supported bxcan"],
      ["lin", "LIN in theory", "lin master slave schedule table break sync pid checksum"],
    ] },
  { id: "power-wdg", file: "power-wdg.html", num: "13", group: "Peripherals",
    title: "Watchdogs, Reset Sources and Low Power", short: "Watchdog & Power", icon: "🔋", accent: "#3fb68b",
    desc: "IWDG vs WWDG, reading reset causes, Sleep/Stop/Standby modes and waking up correctly.",
    sections: [
      ["reset-causes", "Who reset me?", "rcc_csr porrstf pinrstf iwdgrstf sftrstf"],
      ["iwdg", "Independent watchdog", "iwdg lsi kr pr rlr 0xaaaa 0xcccc 0x5555"],
      ["wwdg", "Window watchdog", "wwdg window early wakeup"],
      ["modes", "Sleep, Stop, Standby", "wfi wfe sleepdeep pdds lpds"],
      ["wakeup", "Wake-up sources", "exti rtc alarm wkup pa0"],
      ["after-stop", "Restoring clocks after Stop", "hsi after stop pll reconfigure"],
      ["debug-lowpower", "Debugging low-power code", "dbgmcu_cr dbg_stop dbg_sleep"],
    ] },

  /* ───────────── Group: Embedded engineering ───────────── */
  { id: "rtos", file: "rtos.html", num: "14", group: "Embedded engineering",
    title: "Bare Metal vs RTOS: FreeRTOS on Cortex-M3", short: "FreeRTOS", icon: "🧵", accent: "#60a5fa",
    desc: "When a super-loop stops scaling, how a context switch really works (PendSV), and tasks, queues, mutexes and priorities in FreeRTOS.",
    sections: [
      ["why-rtos", "When you need an RTOS", "super loop rtos determinism"],
      ["context-switch", "A context switch, step by step", "pendsv systick psp stack frame"],
      ["task-states", "Task states (interactive)", "running ready blocked suspended"],
      ["port", "Porting FreeRTOS to the Blue Pill", "freertosconfig configmax_syscall_interrupt_priority port.c cm3"],
      ["ipc", "Queues, semaphores, mutexes", "queue semaphore mutex priority inheritance"],
      ["isr-rules", "ISR rules: FromISR APIs", "fromisr portyield_from_isr priority"],
      ["stack", "Stack sizing and overflow detection", "stack high water mark configcheck_for_stack_overflow"],
    ] },
  { id: "faults-debug", file: "faults-debug.html", num: "15", group: "Embedded engineering",
    title: "Fault Handling and Debugging", short: "Faults & Debugging", icon: "🐞", accent: "#f87171",
    desc: "HardFault anatomy, decoding CFSR/HFSR/MMFAR/BFAR, a fault handler that logs and survives, and a debugging toolbox.",
    sections: [
      ["fault-types", "Fault types on Cortex-M3", "hardfault memmanage busfault usagefault escalation"],
      ["decode", "Decoding CFSR and HFSR", "cfsr hfsr mmfar bfar forced precise imprecise"],
      ["stack-frame", "Recovering the faulting PC", "exception stack frame pc lr"],
      ["handler", "A fault handler that logs", "fault log noinit ram reset reason"],
      ["gdb", "GDB and Cortex-Debug techniques", "gdb watchpoint backtrace x/ registers"],
      ["semihosting-swo", "printf: UART, semihosting, SWO", "semihosting swo itm st-link clone limitation"],
    ] },
  { id: "bootloader", file: "bootloader.html", num: "16", group: "Embedded engineering",
    title: "Bootloaders and Flash Programming", short: "Bootloaders", icon: "🧰", accent: "#e8a36b",
    desc: "ST's system bootloader, writing your own UART bootloader, splitting flash, VTOR relocation and safe jump to application.",
    sections: [
      ["system-bl", "The built-in system bootloader", "system memory usart1 an2606 stm32flash boot0"],
      ["flash-prog", "Programming the F1 flash", "flash_keyr unlock pg per page erase 1 kb"],
      ["layout", "Splitting flash: bootloader + app", "linker split partition 0x08000000 0x08004000"],
      ["vtor", "Relocating the vector table", "scb vtor alignment"],
      ["jump", "Jumping to the application safely", "msp reset handler deinit peripherals"],
      ["protocol", "A tiny update protocol", "crc32 packet ack nack"],
      ["protection", "Read-out and write protection", "rdp wrp option bytes"],
    ] },
  { id: "quality", file: "quality.html", num: "17", group: "Embedded engineering",
    title: "Testing, Static Analysis and MISRA C", short: "Quality & MISRA", icon: "✅", accent: "#3fb68b",
    desc: "Unit tests on the host with Unity, hardware abstraction for testability, cppcheck with the MISRA addon, and what MISRA rules are for.",
    sections: [
      ["testable", "Designing for testability", "hal abstraction dependency injection link seam"],
      ["unity", "Host unit tests with Unity", "unity cmock host gcc ctest"],
      ["static", "Static analysis", "cppcheck gcc -fanalyzer clang-tidy warnings"],
      ["misra", "MISRA C in practice", "misra c 2012 mandatory required advisory deviation"],
      ["bad-good", "Bad vs good: common findings", "essential type implicit conversion side effects"],
      ["deviations", "Writing a deviation record", "deviation permit justification"],
    ] },

  /* ───────────── Group: AUTOSAR Classic ───────────── */
  { id: "autosar-arch", file: "autosar-arch.html", num: "18", group: "AUTOSAR Classic",
    title: "AUTOSAR Classic: Layered Architecture", short: "AUTOSAR Architecture", icon: "🏛️", accent: "#a78bfa",
    desc: "Why AUTOSAR exists, ASW / RTE / BSW / MCAL, the methodology and ARXML, and what is generated vs hand-written in a real project.",
    sections: [
      ["why", "Why AUTOSAR exists", "autosar classic adaptive oem tier1 reuse"],
      ["layers", "Layered architecture explorer", "asw rte bsw services ecu abstraction mcal complex driver"],
      ["methodology", "Methodology and ARXML", "arxml system description ecu extract ecuc configuration"],
      ["generated", "Generated vs hand-written", "generator davinci tresos configuration rte generation"],
      ["release", "Releases and documents", "r25-11 sws srs tr document naming"],
      ["on-bluepill", "How we do AUTOSAR on a Blue Pill", "hand-written mcal honest limitations"],
    ] },
  { id: "autosar-swc", file: "autosar-swc.html", num: "19", group: "AUTOSAR Classic",
    title: "Software Components, Ports and the RTE", short: "SWCs & RTE", icon: "🧩", accent: "#a78bfa",
    desc: "Atomic SWCs, sender-receiver and client-server interfaces, runnables and events, and the RTE API a SWC actually calls.",
    sections: [
      ["swc-types", "SWC types", "application sensor actuator composition atomic"],
      ["interfaces", "Ports and interfaces", "sender receiver client server mode switch port prototype"],
      ["runnables", "Runnables and RTE events", "runnable timing event data received event init"],
      ["rte-api", "The RTE API", "rte_read rte_write rte_call rte_iread rte_irv"],
      ["rte-code", "What generated RTE code looks like", "rte_swc.h rte.c contract header"],
      ["mini-gen", "A tiny RTE generator", "rte generator arxml python"],
    ] },
  { id: "autosar-mcal", file: "autosar-mcal.html", num: "20", group: "AUTOSAR Classic",
    title: "Writing MCAL Drivers the AUTOSAR Way", short: "MCAL Conventions", icon: "🔧", accent: "#a78bfa",
    desc: "Std_Types, compiler abstraction, MemMap, config structures, DET error reporting and naming rules, applied to Port, Dio, Pwm, Adc, Gpt, Wdg and Can on the F1.",
    sections: [
      ["file-layout", "Module file layout", "module.h module.c cfg.h pbcfg.c lcfg"],
      ["std-types", "Std_Types and Platform_Types", "std_returntype e_ok e_not_ok uint8 boolean"],
      ["naming", "API naming: <Ma>_<Api>", "module abbreviation api name dio_writechannel"],
      ["config", "Configuration structures and Init", "configtype init configptr post-build pre-compile"],
      ["memmap", "MemMap and compiler abstraction", "start_sec stop_sec code var_cleared func p2var p2const"],
      ["det", "Development errors with DET", "det_reporterror module id api id error id"],
      ["dio-port", "Port and Dio on the F1", "port_init dio_writechannel dio_readchannel channel group"],
      ["pwm-adc-gpt", "Pwm, Adc and Gpt on the F1", "pwm_setdutycycle adc_startgroupconversion gpt"],
      ["can-wdg", "Can and Wdg on the F1", "can_write can_mainfunction_read wdg_setmode"],
    ] },
  { id: "autosar-os-com", file: "autosar-os-com.html", num: "21", group: "AUTOSAR Classic",
    title: "OS, Scheduling and the COM Stack", short: "OS & COM Stack", icon: "📡", accent: "#a78bfa",
    desc: "OSEK/AUTOSAR OS concepts, mapping runnables to tasks, and a signal's journey through Com, PduR, CanIf and Can.",
    sections: [
      ["os-concepts", "AUTOSAR OS concepts", "osek tasks basic extended alarms counters events scalability class"],
      ["mapping", "Mapping runnables to tasks", "task mapping 10 ms 100 ms schm bsw main functions"],
      ["com-stack", "The COM stack", "com pdur canif can pdu signal i-pdu"],
      ["signal-flow", "End-to-end signal flow", "adc ioHwab rte swc com pdur canif can bus walkthrough"],
      ["can-matrix", "The CAN matrix", "dbc can matrix signal packing endianness"],
      ["ecum", "EcuM and BswM", "ecum startup shutdown bswm mode"],
    ] },
  { id: "autosar-diag-nvm", file: "autosar-diag-nvm.html", num: "22", group: "AUTOSAR Classic",
    title: "Diagnostics (DCM/DEM, UDS) and NvM", short: "Diagnostics & NvM", icon: "🩺", accent: "#a78bfa",
    desc: "UDS services, DTCs and event debouncing in DEM, the DCM request path, and storing data with NvM over Fee on the F1 flash.",
    sections: [
      ["uds", "UDS in one page", "iso 14229 0x10 0x22 0x2e 0x19 0x14 0x3e session nrc"],
      ["dem", "DEM: events and DTCs", "dem_seteventstatus debounce dtc status byte"],
      ["dcm", "DCM: request to response", "dcm dsl dsd dsp did routine"],
      ["iso-tp", "Transport: ISO-TP on CAN", "iso 15765 single frame first frame flow control"],
      ["nvm", "NvM, MemIf, Fee, Fls", "nvm block fee flash emulation wear"],
    ] },
  { id: "autosar-review", file: "autosar-review.html", num: "23", group: "AUTOSAR Classic",
    title: "Code That Passes an OEM / Tier-1 Review", short: "Review-Ready Code", icon: "📝", accent: "#f87171",
    desc: "The checklist reviewers actually use: naming, types, MemMap, error handling, MISRA deviations, traceability and the bad-vs-good gallery.",
    sections: [
      ["checklist", "The review checklist", "review checklist oem tier1"],
      ["gallery", "Bad vs good gallery", "bad good comparison"],
      ["traceability", "Requirements traceability", "requirement id trace test"],
      ["safety", "A word on ISO 26262", "iso 26262 asil freedom from interference"],
    ] },

  /* ───────────── Group: Capstone ───────────── */
  { id: "capstone-baremetal", file: "capstone-baremetal.html", num: "24", group: "Capstone",
    title: "Capstone 1: Turn-Signal ECU, Bare Metal", short: "Capstone: Bare Metal", icon: "🚦", accent: "#fbbf24",
    desc: "Requirements, state machine and a bare-metal implementation of a turn-signal / hazard ECU talking CAN to a cluster node.",
    sections: [
      ["requirements", "Requirements", "requirements turn signal hazard flash rate lamp out"],
      ["architecture", "Architecture", "block diagram can cluster node"],
      ["state-machine", "Turn-signal state machine", "state machine hazard left right comfort blink"],
      ["implementation", "Implementation walkthrough", "super loop scheduler"],
      ["acceptance", "Acceptance tests", "acceptance test robot renode"],
    ] },
  { id: "capstone-rtos", file: "capstone-rtos.html", num: "25", group: "Capstone",
    title: "Capstone 2: The Same ECU on FreeRTOS", short: "Capstone: FreeRTOS", icon: "🚦", accent: "#60a5fa",
    desc: "Splitting the ECU into tasks and queues, timing analysis and what changed vs bare metal.",
    sections: [
      ["task-design", "Task design", "task priorities periods"],
      ["comms", "Queues and events", "queue event group"],
      ["timing", "Timing and watchdog supervision", "deadline watchdog supervision"],
      ["diff", "What changed", "comparison"],
    ] },
  { id: "capstone-autosar", file: "capstone-autosar.html", num: "26", group: "Capstone",
    title: "Capstone 3: Refactoring into AUTOSAR Layers", short: "Capstone: AUTOSAR", icon: "🚦", accent: "#a78bfa",
    desc: "Turning the ECU into an application SWC with runnables over a hand-written RTE, BSW-lite and MCAL on the STM32F103.",
    sections: [
      ["target-arch", "Target architecture", "swc rte bsw mcal layers"],
      ["swc", "The TurnLight SWC", "swc runnables ports"],
      ["rte", "The RTE layer", "rte hand-written mirrors generated"],
      ["bsw", "BSW-lite and MCAL", "com canif can dio pwm adc wdg"],
      ["review", "Self-review against the checklist", "review checklist"],
      ["next", "Where to go next", "real tools davinci tresos s32k aurix"],
    ] },

  /* ───────────── Group: Reference ───────────── */
  { id: "board", file: "board.html", num: "A", group: "Reference",
    title: "Blue Pill Board Reference", short: "Board Reference", icon: "🗺️", accent: "#94a3b8",
    desc: "Interactive pinout, alternate functions, 5 V tolerance, on-board parts and known hardware quirks.",
    sections: [
      ["pinout", "Interactive pinout", "pinout pins alternate function ft"],
      ["onboard", "On-board components", "8 mhz crystal 32.768 khz led pc13 r10 boot jumpers regulator"],
      ["quirks", "Known quirks", "clone cks32 gd32 r10 usb 64k 128k"],
      ["modules", "Common modules", "sn65hvd230 ssd1306 w25q usb uart"],
    ] },
  { id: "troubleshooting", file: "troubleshooting.html", num: "B", group: "Reference",
    title: "Troubleshooting", short: "Troubleshooting", icon: "🧯", accent: "#94a3b8",
    desc: "Symptom-first fixes: no ST-Link, wrong IDCODE, cannot halt, inverted LED, garbage UART, flash size mismatch and more.",
    sections: [
      ["no-stlink", "No ST-Link detected", "st-link not found libusb driver udev permission"],
      ["idcode", "UNEXPECTED idcode on clone chips", "idcode 0x2ba01477 cks32 cs32 gd32 cputapid"],
      ["cannot-halt", "Cannot halt target / SWD locked out", "connect under reset swj_cfg boot0 mass erase"],
      ["led", "LED inverted or dim", "pc13 active low"],
      ["uart-garbage", "Garbage on the UART", "baud mismatch clock brr wrong pll"],
      ["flash-size", "Flash size mismatch", "64k 128k flash size register 0x1ffff7e0"],
      ["hangs-at-clock", "Hangs during clock setup", "hse not ready crystal timeout renode rcc"],
      ["usb", "USB not enumerating", "r10 1.5k pull-up d+"],
      ["can-silent", "CAN sends nothing", "no ack termination transceiver silent loopback"],
    ] },
  { id: "automotive-mcus", file: "automotive-mcus.html", num: "C", group: "Reference",
    title: "From Blue Pill to Automotive-Grade MCUs", short: "Automotive MCUs", icon: "🏭", accent: "#94a3b8",
    desc: "How each lesson maps to NXP S32K1xx, Infineon AURIX TC3xx and Renesas RH850: qualification, safety, vendor MCAL and tooling.",
    sections: [
      ["why-not-f103", "Why the F103 isn't automotive", "aec-q100 iso 26262 lockstep ecc"],
      ["mapping", "Lesson mapping table", "s32k aurix rh850 mapping"],
      ["vendor-mcal", "Vendor MCAL and tools", "rtd mcal tresos davinci"],
    ] },
  { id: "ll-drivers", file: "ll-drivers.html", num: "D", group: "Reference",
    title: "Appendix: ST's LL Drivers", short: "LL Drivers", icon: "📚", accent: "#94a3b8",
    desc: "What ST's Low-Layer drivers are, how they map onto the registers you already know, and when a team picks registers, LL or HAL.",
    sections: [
      ["what-ll", "What LL is (and isn't)", "ll low layer drivers stm32f1xx_ll inline functions"],
      ["side-by-side", "Registers vs LL side by side", "ll_gpio_setpinmode ll_rcc ll_usart registers comparison"],
      ["choosing", "Registers, LL or HAL?", "hal ll registers trade-off portability code size"],
    ] },
  { id: "glossary", file: "glossary.html", num: "E", group: "Reference",
    title: "Glossary", short: "Glossary", icon: "📖", accent: "#94a3b8",
    desc: "Quick reference for MCU, toolchain, bus and AUTOSAR terms.",
    sections: [["glossary", "Glossary of terms", "glossary terms"]] },
];
```

### 3.1 Per-module design sheet

Columns: **Obj** learning objectives · **Pre** prerequisites · **Dia** interactive diagram(s) ·
**Ex** example project(s) · **Analogy** · **Key sources** (full entries go to `R`/`REFS`).
Document IDs: DS5319 (STM32F103x8/xB datasheet), RM0008 (reference manual), PM0056 (Cortex-M3
programming manual), ES096 (medium-density errata, see §4.9), ARM DDI 0403 (ARMv7-M ARM),
ARM DDI 0337 (Cortex-M3 TRM r2p1). Section numbers in this table are from memory and are
re-checked against the current PDF revisions in Phase 0 (📄).

| # | Obj | Pre | Dia | Ex | Analogy | Key sources |
|---|---|---|---|---|---|---|
| 01 Fundamentals | Explain MCU vs MPU; read the memory map; explain `volatile` and read-modify-write; name the toolchain stages | none (C basics) | Memory map visualizer (static mode); bus matrix `D.layered`; "C line → instruction → register write" stepper (sequence engine) | none (snippets from 00) | MCU = **a whole small factory on one chip** (CPU = worker, flash = recipe book, SRAM = workbench, peripherals = machines with control panels = registers) | DS5319 §2–4; RM0008 §3.3 memory map; PM0056 §2; DDI 0403 |
| 02 Setup | Wire SWD; install + verify tools on own OS; build both paths; flash, debug, simulate | 01 | Pinout viewer (SWD wiring mode); BOOT jumper toggle; tab-per-OS installer; memmap of the real 00 ELF; clock switch before/after | **00** | ST-Link = **a USB-to-"surgery port" adapter**: SWD lets a doctor (GDB) pause the heart (core) and inspect organs (registers) | RM0008 §3.4 boot, §7 RCC, §9 GPIO, §27 USART; OpenOCD manual; Cortex-Debug README; Renode docs |
| 03 Startup & linker | Write a vector table and C startup; write a linker script; read a map file | 02 | Reset sequence stepper; memory map + LMA→VMA copy animation; linker-section explorer | 00 (bare), 01 | Linker script = **a moving company's floor plan**: which box goes in which room; startup = unpacking before the family (main) arrives | PM0056 §2.3 exception model; DDI 0403 B1.5; GNU ld manual (Sourceware); RM0008 §3.4 |
| 04 Clocks | Compute any clock in the tree; configure PLL safely with timeouts; set flash latency | 03 | **Clock-tree configurator** (computes SYSCLK/HCLK/PCLK1/PCLK2/ADC/USB, flags limits, outputs `RCC_CFGR`) → register viewer | 00 (clock-72 step), 02 | Clock tree = **gearbox**: crystal is the engine, PLL a gear multiplier, prescalers are reduction gears per wheel | RM0008 §7.2, §7.3.2 (RCC_CFGR), §3.3.3 (FLASH_ACR) |
| 05 GPIO & AFIO | Configure any pin via CRL/CRH; choose BSRR over ODR RMW; know FT/non-FT pins; never disable SWD | 03 | Register viewer (`GPIOx_CRL/CRH`, `AFIO_MAPR`); pinout viewer (electrical mode) | 00, 01 | BSRR = **a light-switch panel with separate ON and OFF buttons**: you can't accidentally flip a neighbour's light | RM0008 §9.1–9.4; DS5319 Table 5 (pin definitions), §5.3.13 I/O characteristics |
| 06 Interrupts | Explain stacking and tail-chaining; set priorities with `__NVIC_PRIO_BITS = 4`; map EXTI lines; protect shared data | 05 | Sequence diagram IRQ entry/exit; NVIC priority playground; EXTI mux diagram | 01, 02 | NVIC = **hospital triage desk**: urgent patients jump the queue, equal urgency waits its turn | PM0056 §2.3, §4.3 NVIC; RM0008 §10 (interrupts & EXTI), §9.4.3 AFIO_EXTICR |
| 07 Timers & PWM | Compute PSC/ARR; generate PWM; apply the APB1 ×2 rule; capture a period | 04, 06 | Waveform engine (PWM duty slider); timer counter animation | 03-pwm | Timer = **metronome with adjustable tempo (PSC) and bar length (ARR)** | RM0008 §15 (TIM2–5), §7.2 (timer clock note) |
| 08 UART | Draw a UART frame; compute BRR; build an ISR-driven ring buffer; parse commands | 06 | Waveform (UART byte, baud/parity/stop controls); BRR calculator; ring-buffer animation | 00, 04-uart-shell | Ring buffer = **sushi conveyor belt**: chef (ISR) adds plates, diner (main) takes them, neither waits | RM0008 §27; ISO 17987 summary (LIN mode) |
| 09 ADC & DMA | Configure ADCPRE ≤14 MHz; calibrate; use scan+DMA circular | 04, 06 | DMA data-flow diagram; SAR conversion stepper | 06-adc-dma | DMA = **conveyor that moves boxes while the manager (CPU) keeps working** | RM0008 §11 (ADC), §13 (DMA); DS5319 §5.3.18 ADC characteristics |
| 10 I2C | Decode a transaction; implement the F1 event sequence; apply errata workarounds | 06 | Waveform (I2C start/addr/ACK/data/stop); F1 event-flag state machine | 07-i2c-oled | I2C = **a polite meeting**: chair says the name (address), the named person nods (ACK) before anyone talks | RM0008 §26; ES096 I2C section; NXP UM10204 (I2C spec) |
| 11 SPI | Pick CPOL/CPHA from a datasheet; manage CS; read JEDEC ID; erase/program | 06 | Waveform (4 modes toggle); W25Q command builder | 08-spi-flash | SPI = **two people passing notes in both directions on every clap** | RM0008 §25; Winbond W25Q datasheet |
| 12 CAN & LIN | Explain arbitration & bit stuffing; compute `CAN_BTR`; configure filters; run 2 nodes; know why USB+CAN conflict | 06, 08 | **CAN frame builder** (ID/DLC/data → stuffed bits + CRC-15 waveform); bit-timing calculator → `CAN_BTR` register viewer; error-state machine | 11-can-two-nodes | Arbitration = **two people starting to talk; whoever says the "louder" (dominant) bit first keeps talking, nobody's words are lost** | RM0008 §24 (bxCAN); ISO 11898-1 summary; TI SN65HVD230 datasheet; Bosch CAN FD spec 1.0 summary; ISO 17987 summary |
| 13 Watchdog & power | Read reset flags; use IWDG; enter/leave Stop; restore clocks | 04, 06 | Power-mode state machine; watchdog timeline | 09-iwdg-fault, 10-lowpower-stop | Watchdog = **dead-man's switch on a train** | RM0008 §5 (PWR), §19 (IWDG), §20 (WWDG), §7.3.10 RCC_CSR |
| 14 FreeRTOS | Decide bare-metal vs RTOS; explain PendSV switch; use queues/mutexes; respect `configMAX_SYSCALL_INTERRUPT_PRIORITY` | 06, 13 | Task-state machine; context-switch sequence diagram; scheduler timeline | 12-freertos | RTOS = **air-traffic control** for many planes sharing one runway | FreeRTOS kernel docs (RTOS-Cortex-M3-M4 page); PM0056 §2.3.3 PendSV |
| 15 Faults & debug | Decode CFSR/HFSR; recover the faulting PC; log across reset | 06 | Register viewer (`SCB_CFSR` with UFSR/BFSR/MMFSR breakdown); fault escalation diagram | 09-iwdg-fault | Fault handler = **flight data recorder** | PM0056 §4.4.10–4.4.15; DDI 0403 B1.5.6 |
| 16 Bootloaders | Use the system bootloader; split flash; relocate VTOR; jump safely | 03, 06 | Flash-partition memmap; jump sequence | 13-uart-bootloader | Bootloader = **airport transfer desk** that checks your ticket (CRC) before letting you board (jump) | AN2606 (system memory boot mode); AN3155 (USART bootloader protocol); PM0075 (STM32F10xxx flash programming manual); PM0056 §4.4.4 VTOR |
| 17 Quality | Write host tests (Unity, CMock when mocks are needed); add a link seam; run cppcheck+MISRA addon; write a deviation | 08 | Bad-vs-good comparisons; test-pyramid diagram | tests in 04, 05; static analysis in CI | MISRA = **traffic code**: most rules prevent the crashes people really had | Unity + CMock docs; Cppcheck manual (MISRA addon); MISRA C:2012 incl. Amendments (rule numbers only) + one note on the newer consolidated edition (D10) |
| 18 AUTOSAR arch | Name every layer and what lives there; explain methodology & ARXML; separate generated vs hand-written | 14, 17 | **AUTOSAR layered explorer** (`D.layered`), methodology flow | none (reading) | AUTOSAR = **standardised shipping containers**: any crane (ECU vendor) can lift any box (SWC) | AUTOSAR_CP_EXP_LayeredSoftwareArchitecture; AUTOSAR_CP_TR_Methodology; AUTOSAR_CP_TR_BSWModuleList (all R25-11) |
| 19 SWCs & RTE | Model a SWC with ports & runnables; read RTE contract headers | 18 | Port/interface diagram; RTE call sequence | capstone stage 3 (SWC + RTE parts) | RTE = **switchboard operator** connecting extensions without callers knowing where the other phone is | AUTOSAR_CP_SWS_RTE; AUTOSAR_CP_TPS_SoftwareComponentTemplate |
| 20 MCAL | Write a module that follows SWS naming, types, config, MemMap, DET | 18, 05–12 | Bad-vs-good gallery; module file anatomy; DET call sequence | `autosar/mcal/*` | MCAL = **universal power adapter**: same plug on top, chip-specific pins underneath | AUTOSAR_CP_SWS_DIODriver, _PortDriver, _PWMDriver, _ADCDriver, _GPTDriver, _WatchdogDriver, _CANDriver, _StandardTypes, _PlatformTypes, _CompilerAbstraction, _MemoryMapping, _DefaultErrorTracer |
| 21 OS & COM | Explain OS objects; map runnables to tasks; follow a signal to the bus | 19, 20, 12 | **Signal-flow walkthrough** (sequence engine, see §9.6); task mapping timeline | capstone stage 3 | COM stack = **postal system**: letter (signal) → envelope (I-PDU) → sorting centre (PduR) → local post office (CanIf) → truck (Can) | AUTOSAR_CP_SWS_OS, _COM, _PDURouter, _CANInterface, _ECUStateManager |
| 22 Diagnostics & NvM | Walk a UDS request through DCM; set/debounce DEM events; size NvM blocks over Fee | 21 | UDS request/response sequence; DTC status-byte bit viewer (register viewer reused); Fee page-swap animation | capstone stage 3 (`Dem`, `Dcm`-lite 0x22/0x19, `NvM`/`Fee`) | DEM = **car's diary of complaints**; DCM = **receptionist** answering the workshop tester | ISO 14229-1 summary; ISO 15765-2 summary; AUTOSAR_CP_SWS_DiagnosticCommunicationManager, _DiagnosticEventManager, _NVRAMManager, _FlashEEPROMEmulation |
| 23 Review-ready | Apply the checklist (§8.3); fix a reviewed file | 20 | Bad-vs-good gallery | `autosar/` | Code review = **pre-flight checklist**, not a matter of taste | AUTOSAR_CP_SWS_* cited per rule; MISRA C:2012 rule numbers; ISO 26262-6 summary |
| 24–26 Capstone | §5.2 | all | state machine, CAN matrix, architecture, acceptance table | `capstone/turnlight/*` | — | UN ECE R48 (flash frequency); project requirements |
| A Board | Read pinout; know quirks | — | **Pinout viewer** (all modes) | — | — | DS5319; RM0008; community schematic (labelled) |
| B Troubleshooting | Fix the top-10 failures | — | decision tree (simple click-through) | — | — | OpenOCD manual; AN2606; DS5319 |
| C Automotive MCUs | Map lessons to S32K1/AURIX/RH850 | 18 | mapping table | — | — | vendor product pages / reference manuals (titles only) |
| D LL drivers | Read LL code and map it to registers; know the trade-offs | 05, 08 | Registers ⇄ LL tabs (lang-switch) | 00 `ll/` | LL = **a thin glove**: you still feel every register, but you don't touch the bits bare-handed | UM1850 (STM32F1 HAL and LL drivers user manual) 📄; STM32CubeF1 sources |

---

## 4. Blue Pill reality: pitfalls and how the site teaches around them

Every claim below goes into `board.html#quirks`, the related module, and `troubleshooting.html`,
with its source. I verified the items marked 🔎 against primary files during this session. Items
marked 📄 must be checked against the PDF in Phase 0, because `st.com` is blocked by this session's
network policy.

### 4.1 Clone / counterfeit MCUs
- Clones (CKS32F103, CS32F103, APM32F103, GD32F103) are common on Blue Pills sold online.
- 🔎 OpenOCD's `target/stm32f1x.cfg` expects SW-DP ID `0x1ba01477` unless `CPUTAPID` is set.
  CKS/CS32 parts report `0x2ba01477`, so OpenOCD prints "UNEXPECTED idcode" and stops.
  **Fix taught:** our `examples/common/openocd/bluepill-clone.cfg` does `set CPUTAPID 0x2ba01477`
  before `source [find target/stm32f1x.cfg]`. **Never** edit OpenOCD's installed scripts.
- Clones can behave differently: flash timing, the RC oscillator, ADC accuracy, missing USB
  details, I2C quirks. The site states that **all examples are validated on a genuine ST part** and
  lists what was also tested on clones (`examples/*/README.md` → "Tested on" table).
- Identification lesson: read `DBGMCU_IDCODE` (0xE0042000) and the 96-bit unique ID at
  `UID_BASE 0x1FFFF7E8` 🔎. Compare against RM0008 §31.6.1 📄. Teach the laser-marking check
  (logo, "STM32F103C8T6", date code) as a community heuristic, with that label shown.

### 4.2 64 KB vs 128 KB flash
- DS5319 specifies 64 KB for C8. Many C8 dies let you program 128 KB, but that flash is untested
  and undocumented.
- 🔎 **OpenOCD's stock `board/stm32f103c8_blue_pill.cfg` sets `FLASH_SIZE 0x20000` (128 KB)**,
  and its own comment admits that this is outside spec. **The site never uses that board file.** Our
  `bluepill.cfg` sets `FLASH_SIZE 0x10000`.
- 🔎 ST's own template `STM32F103XB_FLASH.ld` (cmsis-device-f1) is for the **xB (128 KB)** part.
  It also sets `_estack = 0x20004FFF`, which is **not 8-byte aligned** as AAPCS requires.
  Our linker script uses `LENGTH = 64K` / `20K` and `_estack = ORIGIN(RAM) + LENGTH(RAM)`
  (`0x20005000`). Teach it in `boot.html#pitfalls`.
- Teach reading the flash-size register `FLASHSIZE_BASE 0x1FFFF7E0` 🔎 (in KB) at runtime.

### 4.3 USB D+ pull-up (R10)
- USB full-speed needs about 1.5 kΩ from D+ to 3.3 V (USB 2.0 spec §7.1.5). Many Blue Pills fit
  10 kΩ or 4.7 kΩ at R10. Some hosts enumerate them anyway, others don't. Community reports agree
  on the fix: measure PA12 ↔ 3.3 V and replace R10 with 1.5 kΩ, or add ~1.8 kΩ in parallel.
- Scope: **no example in the core path uses USB**, so learners don't hit it on day one.
  USB appears only as a quirk on `board.html` and in `troubleshooting.html#usb`. That is also a
  deliberate result of §4.6 (USB vs CAN).

### 4.4 BOOT jumpers, reset, SWD pins
- 📄 RM0008 §3.4, Table 9: BOOT0=0 → main flash; BOOT0=1, BOOT1=0 → system memory (ST
  bootloader); BOOT0=1, BOOT1=1 → SRAM. BOOT1 is **PB2** on the Blue Pill's second jumper.
- 🔎 `AFIO_MAPR.SWJ_CFG`: `JTAGDISABLE` keeps SW-DP (frees PA15/PB3/PB4). `DISABLE` turns off
  SWD as well, which **locks you out** as soon as the code runs. The site always uses
  `AFIO_MAPR_SWJ_CFG_JTAGDISABLE` when it needs PB3/PB4/PA15. A `warn` callout explains `DISABLE`.
- Recovery, taught in this order:
  1. **Connect under reset:** `reset_config srst_only srst_nogate connect_assert_srst` in OpenOCD.
     This needs the ST-Link **RST** pin wired to Blue Pill **R**. Clones' RST pins are unreliable,
     so the site also teaches the manual way: hold RESET, start the command, release.
  2. **Boot into the system bootloader** (BOOT0=1), so user code never runs. Then mass-erase with
     OpenOCD (`stm32f1x mass_erase 0`) or STM32CubeProgrammer.
  3. If read-out protection is set: CubeProgrammer option bytes → RDP level 0, which mass-erases.
- 🔎 ST-Link firmware: OpenOCD's `interface/stlink.cfg` notes that ST-LINK/V2 firmware older than
  **V2J24** lacks "dapdirect". Teach checking and upgrading the firmware with CubeProgrammer. A
  clone may refuse the upgrade, and the warning says so.

### 4.5 PC13 LED and PC13–PC15 drive
- The LED's cathode is on PC13 (anode to 3.3 V through a resistor), so **writing 0 turns it on**.
  Every example uses `LED_ON()` / `LED_OFF()` macros that hide the inversion, and the page shows
  why.
- 📄 DS5319 pin-definitions footnote: PC13–PC15 are supplied through the backup power switch,
  which sinks only ~3 mA. Output speed ≤ 2 MHz with ≤ 30 pF, and **these pins must not be used
  as a current source** (for example to drive an LED). The on-board LED is fine because PC13
  *sinks*. Examples that need more LEDs use PB12–PB15 / PA0–PA3.

### 4.6 5 V-tolerant vs non-tolerant pins
- 📄 DS5319 Table 5 marks FT pins. On the LQFP48 the **non-FT** I/Os are PA0–PA7, PB0, PB1, PC13–PC15
  and (to confirm) PB5. All analog-capable pins are non-FT.
- The pinout viewer's data file (`bluepill-pins.js`) stores `ft: true|false` per pin **with a
  table reference**. The rule for authors: no pin goes into the data until someone has checked it
  against Table 5.
- Teaching: the USB-UART adapter must be a **3.3 V-logic** adapter or jumpered to 3.3 V. USART1 RX
  (PA10) is FT, but the habit matters.

### 4.7 bxCAN and USB share SRAM; CAN needs a transceiver
- 📄 RM0008 §24.1: in low-, medium-, high- and XL-density devices, USB and bxCAN share a dedicated
  512-byte SRAM. They can't be used at the same time, though one application can switch between them.
- 🔎 They also **share interrupt vectors**: `USB_HP_CAN1_TX_IRQn = 19`, `USB_LP_CAN1_RX0_IRQn = 20`
  (stm32f103xb.h).
- Hardware: an SN65HVD230 module per node (3.3 V), 120 Ω termination at **both ends**, and common GND.
  Many modules already carry a 120 Ω resistor; the wiring page shows how to check. A single node in
  normal mode gets **no ACK** and keeps retransmitting. Example 11 therefore starts in
  loopback + silent mode, then moves to two nodes.
- Default CAN pins: PA11 (RX) / PA12 (TX), which are also USB D−/D+. The R10 pull-up sits on PA12 (CAN TX)
  and is harmless there, but the page says so. Remap option: PB8/PB9 (`AFIO_MAPR.CAN_REMAP = 10`).
  **Example 11 uses PB8/PB9** so the USB connector stays free for power.

### 4.8 Alternative flashing via the USART1 system bootloader
- BOOT0=1 → reset → the ST bootloader listens on USART1 PA9/PA10 (AN2606; protocol in AN3155).
- Tools: `stm32flash` (CLI, open source) or STM32CubeProgrammer (UART mode). Taught in
  `setup.html#flash` as "Path C: no ST-Link? Use a USB-UART adapter", and again in
  `bootloader.html#system-bl`.
- Caveat: no debugging on this path. Set BOOT0 back to 0 afterwards.

### 4.9 Corrections to the brief
- The errata sheet for STM32F103**x8/xB** (medium density) is **ES096** (DocID14574; last public
  revision seen: Rev 13, Nov 2015). **ES0340** covers the **high-density** STM32F101xC/D/E /
  F103xC/D/E. The site cites ES096. 📄 Confirm on st.com in Phase 0.
- The datasheet is **DS5319**.
- The "Blue Pill schematic" is **not an ST document**. It's a widely circulated vendor schematic.
  It gets cited with a `community` badge, and claims that depend on it (R10 value, LED polarity) are
  phrased as "on most boards; measure yours".
- 🔎 `FLASH_ACR_LATENCY_2` in cmsis-device-f1 v4.3.5 is **bit 2 of the field (0x4)**, *not* "two wait
  states". Two wait states is `0x2` (`FLASH_ACR_LATENCY_1`). This is a real trap, and the site
  writes `(2U << FLASH_ACR_LATENCY_Pos)` with an explanation.

---

## 5. Example & mini-project catalog

### 5.1 Examples

Conventions for every `examples/NN-name/`:
- `README.md` with YAML front matter (`id, title, board, modules, peripherals, flavor, sim, hw, tested_on`),
  which `tools/gen-catalog.py` reads.
- `CMakeLists.txt`. It builds `NN-name.elf/.hex/.bin`, prints size, and adds `flash` and `renode`
  targets.
- `wiring.svg`, generated from `bluepill-pins.js` by the pinout engine's export mode. That way the
  diagrams never disagree with the pin data.
- `expected-output.txt`: exact UART text on real hardware.
- `renode/NN.resc` + `test/NN.robot`, when `sim ≠ none`.
- `test/` host unit tests where logic is separable.

Reordered from your draft: UART interrupts come before PWM/ADC, because later examples log through
it. Low power comes before FreeRTOS so bare metal finishes first. The bootloader moves to the end.

| # | Folder | Modules | Peripherals | Flavor | Hardware beyond Blue Pill + ST-Link | Learner observes | Renode |
|---|---|---|---|---|---|---|---|
| 00 | `00-bluepill-blink-uart` (`bare/`, `hal/`, `ll/`) | 02, 03, 04, 05, D | GPIOC, RCC, FLASH, USART1 | bare + HAL (+ LL for Appendix D) | USB-UART (3.3 V) | PC13 blinks at 1 Hz on HSI, then visibly faster after switching to 72 MHz with the same delay loop; then a SysTick-based 1 Hz blink; `Hello from Blue Pill @ 72 MHz` at 115200 | ✅ UART text + LED state via Robot. ⚠️ The **speed-up is not reproduced**: Renode's SysTick frequency and instruction rate don't follow RCC |
| 01 | `01-exti-button-debounce` | 05, 06 | GPIO, AFIO, EXTI, NVIC | bare | button on PA0 → GND | press toggles LED; bounce counter printed raw vs debounced | ✅ `Button` peripheral pressed from Robot; bounce not simulated |
| 02 | `02-systick-scheduler` | 06 | SysTick | bare | — | 3 tasks at 10/100/500 ms; load % printed | ✅ timing in virtual time |
| 03 | `03-tim-pwm-dimming` | 07 | TIM2 CH1 (PA0) / TIM3 CH1 (PA6) | bare | LED + 330 Ω on PA6 | breathing LED; duty printed | ⚠️ timer registers yes, PWM pin waveform only via GPIO state logs |
| 04 | `04-uart-shell-ringbuffer` | 08 | USART1 IRQ | bare + host tests | USB-UART | `help`, `led on`, `clock`, `regs rcc` commands | ✅ type into the UART analyzer from Robot |
| 05 | `05-adc-pot-dma` | 09 | ADC1, DMA1 ch1 | bare + host tests (filter) | 10 kΩ pot on PA1 | mV readings, then DMA circular buffer averages | ⚠️ spike needed: Renode's `STM32_ADC` is the F4-style model (no F1 `CAL/RSTCAL`). Use a Python peripheral or label "hardware only" |
| 06 | `06-i2c-oled-ssd1306` | 10 | I2C1 (PB6/PB7) | bare | SSD1306 128×64 I2C | text + bar graph from pot | ⚠️ I2C transactions logged by a dummy slave. **Pixels not shown** |
| 07 | `07-spi-flash-w25q` | 11 | SPI1 (PA5/6/7, CS PA4) | bare | W25Q32/64 module | JEDEC ID, erase/program/verify a page | ✅ `GenericSpiFlash` (JEDEC ID configurable; spike) |
| 08 | `08-iwdg-hardfault` | 13, 15 | IWDG, SCB | bare | — | forced faults (div0 trap, bad address, unaligned) → decoded CFSR on UART; reset cause after IWDG | ✅ fault decoding; ⚠️ IWDG needs `STM32_IndependentWatchdog` added to overlay |
| 09 | `09-lowpower-stop` | 13 | PWR, EXTI, RTC alarm | bare | button | current drops (measure with multimeter); wake by button/RTC | ❌ power not modelled; logic path only |
| 10 | `10-freertos-basics` | 14 | SysTick, PendSV, USART1 | RTOS | — | 3 tasks, queue, mutex-protected UART, stack high-water marks | ✅ |
| 11 | `11-can-two-nodes` | 12 | bxCAN (PB8/PB9 remap) | bare | 2× SN65HVD230, 2nd Blue Pill, twisted pair, 120 Ω ×2 | loopback first; then node A button → node B LED; error counters printed when the bus is unplugged | ⚠️ `STMCAN` + Renode `CANHub` between two machines: frame level only. **No bit timing, no transceiver, no error frames** |
| 12 | `12-uart-bootloader` | 16 | FLASH, USART1, SCB VTOR | bare | USB-UART | bootloader at 0x08000000 (16 KB), app at 0x08004000; upload via a Python script; CRC check; jump | ✅ flash writes need an F1 FLASH controller stub (spike) |
| 13 | `13-lin-two-nodes` *(optional, Phase 8)* | 08, 12 | USART LIN mode | bare | 2nd Blue Pill, diode + 1 kΩ pull-up "logic-level LIN" (no 12 V transceiver) | master schedule table, slave response, break detection | ⚠️ UART-level only |

**Capstone `capstone/turnlight/`.** Board(s): 2 Blue Pills (ECU node + cluster node), 3 buttons,
2 LEDs (or LED + 2N7002 for "lamps"), pot (lamp-current simulation), SSD1306 on the cluster node,
2× SN65HVD230.

### 5.2 Capstone: "TurnLight" body ECU

**Requirements (excerpt; full list in `capstone/turnlight/docs/requirements.md`, IDs `TL-REQ-xxx`):**

| ID | Requirement |
|---|---|
| TL-REQ-001 | Left/right stalk inputs (buttons PB12/PB13, active-low, debounced 20 ms) request the turn indicator of that side. |
| TL-REQ-002 | Flash frequency 1.5 Hz ± 0.5 Hz, duty 50 % ± 10 % (in line with the direction-indicator flashing frequency in UN ECE R48, i.e. 90 ± 30 flashes/min; exact clause cited in Phase 7). The project target is 1.5 Hz ± 2 %. |
| TL-REQ-003 | Hazard button (PB14) overrides turn requests; both sides flash in phase. |
| TL-REQ-004 | Comfort blink: a tap < 500 ms produces exactly 3 flash cycles. |
| TL-REQ-005 | Lamp-out detection: the simulated lamp current (pot on PA1) < threshold while ON → double flash frequency + DEM event `TL_E_LAMP_OUT_<side>`. |
| TL-REQ-006 | ECU node sends `TurnLightStatus` (ID `0x3A0`, 100 ms cycle + on change, hypothetical) on CAN; cluster node shows telltales on the OLED. |
| TL-REQ-007 | Cluster node sends `ClusterAck` (ID `0x3A1`, hypothetical). Missing for > 500 ms → ECU reports a communication DTC and keeps lamps working. |
| TL-REQ-008 | Lamps are PWM-dimmed outputs (TIM3) with soft on/off ramp of 20 ms. |
| TL-REQ-009 | IWDG timeout of 100 ms; the main loop/tasks feed it only after all supervised activities have checked in. |
| TL-REQ-010 | After any reset, the reason is logged and reported in `TurnLightStatus.ResetCause`. |

**Stage 1: bare metal** (`stage1-baremetal/`): a cooperative scheduler (from example 02),
`turnlight_sm.c` (pure logic, host-tested), drivers from examples 01/03/05/11.
**Acceptance:** Robot tests in Renode for TL-REQ-001/003/004/006 (CAN via CANHub), plus a
hardware checklist for 002 (measured with a phone slow-motion video or a logic analyser),
005, 008 and 009.

**Stage 2: FreeRTOS** (`stage2-freertos/`): tasks `InputTask` 10 ms, `LogicTask` 10 ms,
`LampTask` 5 ms, `CanTask` (event-driven + 100 ms), `SupervisorTask` 50 ms (watchdog). Queues for
input events, an event group for CAN RX. **Acceptance:** the same Robot suite passes unchanged (the
same black-box behaviour), plus stack high-water and CPU-load numbers documented.

**Stage 3: AUTOSAR-style** (`stage3-autosar/`), using `autosar/`:

```
 ┌──────────────── Application (ASW) ────────────────┐
 │ SWC TurnLight   runnables: RE_TurnLight_Init,     │
 │                 RE_TurnLight_10ms                 │
 │ SWC LampMonitor RE_LampMonitor_100ms              │
 └────── Rte_Read_/Rte_Write_/Rte_Call_ (hand-written RTE, mirrors generated) ─┘
 ┌ Services ───────────┐┌ ECU abstraction ─┐
 │ EcuM-lite WdgM-lite ││ IoHwAb (project) │
 │ Com-lite PduR-lite  ││ CanIf-lite WdgIf │
 │ Dem-lite Det NvM/Fee││                  │
 └─────────────────────┘└──────────────────┘
 ┌ MCAL (hand-written to SWS APIs over STM32F1 registers) ┐
 │ Mcu Port Dio Pwm Adc Gpt Wdg Can Fls                    │
 └─────────────────────────────────────────────────────────┘
   OS: autosar/os_shim, an OSEK/AUTOSAR-OS-like API over FreeRTOS: labelled NOT an AUTOSAR OS
```

Folder: `stage3-autosar/{asw/TurnLight/, asw/LampMonitor/, rte/, cfg/ (all *_Cfg.h/*_PBcfg.c and Os_Cfg.c as "generated" files with a header banner), integration/main.c}`.
The OS shim is described in §8.2.
**Acceptance:** the same Robot suite passes. `tools/check-autosar.py` (§8.3) passes. cppcheck MISRA
reports zero unjustified violations in `asw/` and `autosar/mcal/`. Every deviation has a record in
`docs/deviations.md`.

---

## 6. Environment setup plan

### 6.1 Pinned versions (`tools/versions.json`)

Values verified from upstream tags on 2026-10-24 unless marked 📄 (st.com is blocked here; pin it
in Phase 0). CI reads this file, the setup page renders it, and only this file may hold versions.

| Tool | Pin | Notes |
|---|---|---|
| Arm GNU Toolchain (`arm-none-eabi`) | **15.2.Rel1** (xPack equivalent `15.2.1-1.1`) | xPack tags show 15.2.1-1.1 as latest. Arch already ships a 16.1-based build; it's not used. Verify the Arm download page in Phase 0. |
| CMake | **4.4.x** (≥ 3.25 required by our presets) | Kitware tag v4.4.4 |
| Ninja | **1.13.2** | |
| OpenOCD | **0.12.0** (xPack `0.12.0-7.1`) | No 0.13 release exists. Windows/macOS use the xPack build, Linux the distro package or xPack. |
| pyOCD | 0.46.0 (optional alternative) | |
| VS Code + Cortex-Debug | Cortex-Debug 1.12.x 📄 (Marketplace version; the repo's tags are inconsistent) | Extensions: `marus25.cortex-debug`, `ms-vscode.cmake-tools`, `ms-vscode.cpptools` |
| STM32CubeIDE / CubeMX / CubeProgrammer | 📄 latest at Phase 0 | CubeMX ≥ 6.11 generates CMake projects (verify) |
| STM32CubeF1 (HAL) | **v1.8.7** | only for `00/hal` |
| cmsis-device-f1 | **v4.3.5** | Apache-2.0 |
| CMSIS 6 (Core) | **v6.4.0** | Apache-2.0 |
| FreeRTOS-Kernel | **V11.3.x** (tags up to V11.3.2 seen) | MIT |
| Renode | **1.17.0** | tag v1.17.0 |
| Unity | **v2.7.0** | host tests via CMake/CTest (no Ceedling, so no Ruby) |
| CMock | **v2.7.0** | vendored only when the first test needs mocks; mocks generated by its script (needs Ruby only on the author's machine), generated mocks committed |
| Playwright (`@playwright/test`) | **1.64.x** | browser smoke test; exact version in `tests/site/package-lock.json` |
| STM32F103 SVD | checksum pinned | downloaded by `tools/fetch-svd.py`, not committed (§2.4) |
| Cppcheck | **2.22.0** | MISRA addon |
| stm32flash | latest distro package 📄 | |
| lychee (link check) | 0.15.x | |
| ST-Link firmware | ≥ V2J24 | needed for OpenOCD dapdirect |

### 6.2 Per-OS installation (rendered as OS tabs on `setup.html#install`)

Each step has **"Verify"** (command + expected output, shown as a `console` code block) and
**"If it fails"** (link into troubleshooting).

**Windows 10/11**
1. Arm GNU Toolchain `.exe`/`.zip` (x86_64-arm-none-eabi), with "add to PATH" ticked → Verify
   `arm-none-eabi-gcc --version` shows `15.2.1`.
2. CMake (MSI, add to PATH) and Ninja (`winget install Ninja-build.Ninja`) → `cmake --version`, `ninja --version`.
3. ST-LINK USB driver **STSW-LINK009** → Device Manager shows "STM Device in DFU Mode" /
   "ST-Link Debug" under Universal Serial Bus devices.
4. xPack OpenOCD zip → `openocd -v`, then the board connect test
   `openocd -f examples/common/openocd/bluepill.cfg -c "init; targets; shutdown"` shows
   `stm32f1x.cpu  cortex_m  little stm32f1x.cpu  halted` or `running`.
5. VS Code + extensions; Git for Windows.
6. Optional: STM32CubeIDE (path A) and STM32CubeProgrammer.
7. USB-UART: CH340/CP2102 driver if Windows doesn't auto-install. Find the COM port.
8. Renode Windows package → `renode --version`.

**Linux (Ubuntu 24.04 LTS as reference; Fedora notes in a collapsible)**
1. Toolchain tarball into `/opt/arm-gnu-toolchain-15.2.rel1/`, add to PATH. Distro
   `gcc-arm-none-eabi` is allowed but not pinned, and the page explains the version-drift risk.
2. `sudo apt install cmake ninja-build openocd git` (OpenOCD 0.12 on 24.04; xPack otherwise).
3. **udev rules:** copy OpenOCD's `contrib/60-openocd.rules` to `/etc/udev/rules.d/`, then
   `sudo udevadm control --reload && sudo udevadm trigger`. Add the user to `plugdev` (Debian/Ubuntu)
   and to `dialout` (for `/dev/ttyUSB0`). Verify: `lsusb | grep 0483:3748`.
4. Renode `.deb` or portable tarball.
5. VS Code (.deb) + extensions.

**macOS (Apple Silicon + Intel)**
1. Arm GNU Toolchain `.pkg` (darwin-arm64 or darwin-x86_64), and add
   `/Applications/ArmGNUToolchain/15.2.rel1/arm-none-eabi/bin` to PATH.
2. `brew install cmake ninja open-ocd`, or xPack OpenOCD for the pinned version.
3. No ST-Link driver needed. USB-UART appears as `/dev/cu.usbserial-*` (CH340 needs the vendor driver on older macOS).
4. Renode macOS package 📄 (check Apple Silicon support status in Phase 0).
5. Gatekeeper: `xattr -dr com.apple.quarantine <xpack folder>` for unsigned xPack binaries
   (explained, not hidden).

### 6.3 Debugger configuration
- `.vscode/launch.json` per example (committed): `"servertype": "openocd"`,
  `"configFiles": ["examples/common/openocd/bluepill.cfg"]`,
  `"svdFile": "${workspaceFolder}/.cache/svd/STM32F103.svd"` (fetched by `python3 tools/fetch-svd.py`,
  a step on `setup.html#install` with a "Verify" check), `"runToEntryPoint": "main"`.
  A second configuration covers clone chips. A third, `"servertype": "external"`, attaches to Renode's GDB
  server (`machine StartGdbServer 3333`).
- Learners practise breakpoint, step over/into, watch `SystemCoreClock`, peripheral view `RCC → CFGR`,
  and memory view at `0x20000000`.

### 6.4 Simulator
- **Renode 1.17.0** with a project overlay `examples/common/renode/bluepill.repl` that loads
  `platforms/cpus/stm32f103.repl` and fixes the gaps found in §7.3.
- `make renode` / `cmake --build build --target renode` opens Renode with the example's `.resc`.
  CI runs `renode-test examples/NN/test/NN.robot`.

---

## 7. Simulation strategy (accuracy section)

### 7.1 What each example can and cannot simulate
The catalog's "Renode" column (§5.1) is rendered on every example page as a **"Simulation
fidelity"** callout with three lists: ✅ faithful, ⚠️ approximated, ❌ not simulated.

### 7.2 Renode's stock `stm32f103.repl` (🔎 read from `renode/renode@master`, 2026-10-24)
Present: Cortex-M3 + NVIC (`systickFrequency: 72000000` fixed), USART1–5, I2C1/2 (`STM32F1_I2C`),
EXTI, GPIO A–G (`STM32F1GPIOPort`), AFIO, TIM1–14, DMA1/2, and an SVD applied for register names.
**Missing or approximate:**
- **No RCC model.** Only `RCC_CR` is tagged with a constant `0x0A020083` (HSIRDY/HSERDY/PLLRDY
  read as set). **`RCC_CFGR.SWS` therefore never reports PLL**, so the usual
  `while ((RCC->CFGR & RCC_CFGR_SWS) != RCC_CFGR_SWS_PLL)` **hangs in Renode**.
- SysTick and timers run at fixed frequencies, independent of RCC. The 00 "blink speeds up at
  72 MHz" effect cannot be shown.
- `flash` is a 512 MB `MappedMemory` and `sram` 256 MB. **Overflowing 64 KB/20 KB is not detected.**
- No ADC, SPI, bxCAN, IWDG, PWR, RTC/BKP, FLASH controller or USB in the stock file.

### 7.3 Project overlay (`examples/common/renode/bluepill.repl`), validated in the Phase-0 spike
1. RCC: a small Python peripheral (or a C# `STM32F1_RCC` contributed upstream later) that mirrors
   `CFGR.SW → CFGR.SWS`, tracks `APB2ENR/APB1ENR`, and keeps `CR` ready bits.
2. Memory sized to the C8: flash 64 KB, SRAM 20 KB (`sram` re-declared), so overflows fault as on
   hardware.
3. Add `spi1: SPI.STM32SPI` + `GenericSpiFlash` (W25Q JEDEC ID), `can1: CAN.STMCAN @ 0x40006400`
   (+ `CANHub` for two machines), `iwdg: Timers.STM32_IndependentWatchdog @ 0x40003000`, a FLASH
   controller stub (KEYR/SR/CR/AR) for example 12, an LED on PC13 (`Miscellaneous.LED`, inverted) and
   buttons.
4. ADC: evaluate `STM32_ADC` (F4-style register map) against RM0008 §11.12. If it doesn't match,
   use a Python peripheral covering CR2 `ADON/CAL/RSTCAL/SWSTART`, SR `EOC` and DR from a scripted value.
5. All overlay pieces carry a comment block naming the RM0008 section they model.

### 7.4 QEMU evaluated and rejected
- 🔎 xPack QEMU Arm **v9.2.4-1 (Oct 2025) no longer ships `qemu-system-gnuarmeclipse`**, the
  legacy QEMU 2.8 fork that had a `BluePill` machine. Its 2022 release note already marked it deprecated.
- Upstream QEMU has no STM32F103 machine. The nearest is `stm32vldiscovery` (STM32F100, value line,
  with few peripherals).
- Decision: Renode only. `fundamentals.html` and `setup.html#renode` say why in one paragraph.

---

## 8. AUTOSAR track design

### 8.1 Pinned release and citation rules
- **AUTOSAR Classic Platform R25-11** (published 2025-11-27, supersedes R24-11; the specs are free
  from autosar.org). Document naming since R22-11 is `AUTOSAR_CP_<type>_<Name>.pdf`, for example
  `AUTOSAR_CP_SWS_DIODriver.pdf`.
- Every rule taught cites **document + requirement ID**, in the form "`[SWS_Dio_<nnnnn>]`,
  AUTOSAR_CP_SWS_DIODriver, R25-11" (the number copied from the PDF). In Phase 6 the author copies IDs from the PDF and never makes
  them up. `check-site.py` rejects `SWS_` or `SRS_` IDs that aren't listed in
  `tools/autosar-ids.txt`, which the author fills while reading the spec.
- **R25-11 is the only release cited** (D4). Many production ECUs still run on **R4.x** (4.3.1/4.4.0),
  so a recurring **"In production (R4.x)"** box (`callout prod`, icon 🏭) appears wherever an API,
  file layout, configuration class or behaviour that learners will meet in real ECUs differs from R25-11.
  Each box names the R4.x document it compares against.
- **No automatic re-pin.** When R26-11 is published, a separate **"R26-11 review" milestone** (§11)
  diffs the cited documents and requirement IDs. Re-pinning is a deliberate decision recorded in this file.

### 8.2 Conceptual vs hands-on

| Topic | Conceptual (page only) | Hands-on (code in repo) |
|---|---|---|
| Layered architecture, methodology, ARXML | ✅ explorer + methodology flow | minimal ARXML in `autosar/arxml/` (SWC + interfaces only), optional `tools/rte-gen` |
| SWCs, ports, runnables, RTE | ✅ | ✅ `TurnLight`, `LampMonitor` SWCs + hand-written `Rte_TurnLight.h` / `Rte.c` |
| MCAL: Mcu, Port, Dio, Pwm, Adc, Gpt, Wdg, Can, Fls | ✅ | ✅ full SWS signatures for the subset we use; unsupported APIs are listed, not stubbed silently |
| ECUAL: IoHwAb, CanIf, WdgIf | ✅ | ✅ "-lite" |
| Services: EcuM, BswM | ✅ | EcuM-lite (init sequence only); BswM concept only |
| OS | ✅ OSEK concepts, scalability classes, alarms | ⚠️ `autosar/os_shim` over FreeRTOS with an OSEK/AUTOSAR-OS-like API (tasks, alarms, events), **labelled "not a real AUTOSAR OS"** (see below). Trampoline is backlog: an optional advanced appendix, not in the core path (D5) |
| COM stack: Com, PduR, CanIf, Can | ✅ signal-flow walkthrough | ✅ "-lite": static signal packing, one CAN channel, no gateways |
| Diagnostics: DCM, DEM, UDS, ISO-TP | ✅ | DEM-lite (events, debouncing, status byte); DCM-lite (0x10, 0x22, 0x19 subset over single-frame ISO-TP), stretch goal |
| NvM / MemIf / Fee / Fls | ✅ | NvM-lite + Fee over 2 × 1 KB F1 flash pages (stretch goal) |
| WdgM | ✅ alive/deadline supervision | WdgM-lite alive supervision |
| Safety (ISO 26262), E2E, SecOC | ✅ overview only | ❌ |

**OS shim design (D5).** It exists so the SWC/BSW code looks like code written against a real
AUTOSAR OS:
- API subset (OSEK OS 2.2.3 / ISO 17356-3 names, as reused by AUTOSAR_CP_SWS_OS): `StartOS`,
  `ShutdownOS`, `ActivateTask`, `TerminateTask`, `ChainTask`, `SetRelAlarm`, `SetAbsAlarm`,
  `CancelAlarm`, `SetEvent`, `ClearEvent`, `GetEvent`, `WaitEvent`, `GetResource`, `ReleaseResource`,
  with `TASK(Name)` / `ALARMCALLBACK` / `DeclareTask` macros and `StatusType` return codes (`E_OK`,
  `E_OS_LIMIT`, …).
- Static configuration in `cfg/Os_Cfg.c` (task table, priorities, alarms, counter = FreeRTOS tick),
  labelled as "generated by the OS configurator in production".
- Mapping: basic task → FreeRTOS task blocked on a task notification; extended task → FreeRTOS task +
  event group; alarm → FreeRTOS software timer that activates a task or sets an event; resource → mutex.
- **Documented differences** (shown on `autosar-os-com.html#os-concepts` as a table): no conformance
  classes, activation limit 1, resources use priority inheritance instead of the OSEK priority ceiling,
  no protection hooks, timing protection, OS-Applications or IOC, and no OSEK `Schedule()` semantics for
  non-preemptive tasks.

Labelling: every file in `autosar/` and `capstone/turnlight/stage3-autosar/` starts with a banner:

```c
/* MCU Academy — AUTOSAR-style teaching code. NOT an AUTOSAR-conformant implementation.
 * Spec reference : AUTOSAR CP R25-11, AUTOSAR_CP_SWS_DIODriver
 * In production  : GENERATED by the MCAL configurator (cfg) | VENDOR-SUPPLIED (MCAL) | HAND-WRITTEN (SWC)
 */
```

### 8.3 Coding / naming conventions checklist (taught on `autosar-mcal.html` and `autosar-review.html`, and enforced by `tools/check-autosar.py` where machine-checkable)

| # | Rule | Source to cite | Machine-checked |
|---|---|---|---|
| 1 | Public APIs are `<Ma>_<ApiName>` with the module abbreviation from the BSW module list (`Dio_WriteChannel`, `Can_Write`). | AUTOSAR_CP_SRS_BSWGeneral; TR_BSWModuleList | ✅ regex per module |
| 2 | Files: `<Ma>.h`, `<Ma>.c`, `<Ma>_Cfg.h` (pre-compile), `<Ma>_PBcfg.c` (post-build), `<Ma>_Lcfg.c` (link-time), `<Ma>_MemMap.h`. | SRS_BSWGeneral; SWS_MemoryMapping | ✅ |
| 3 | Return `Std_ReturnType` (`E_OK`, `E_NOT_OK`) where the SWS says so; never ad-hoc `int` error codes. | AUTOSAR_CP_SWS_StandardTypes | partly |
| 4 | Use AUTOSAR platform types (`uint8`, `uint16`, `uint32`, `boolean`, `TRUE/FALSE`) in BSW interfaces. Application SWCs use RTE/implementation data types. | AUTOSAR_CP_SWS_PlatformTypes | ✅ (no `<stdint.h>` types in public BSW headers) |
| 5 | Init via `<Ma>_Init(const <Ma>_ConfigType* ConfigPtr)`; configuration lives in `const` structures in config files, never in the driver `.c`. | module SWS; SRS_BSWGeneral | partly |
| 6 | Symbolic names for configured objects (`DioConf_DioChannel_LampLeft`) generated into `<Ma>_Cfg.h`. | SWS_Dio (symbolic names), ECUC spec | ✅ |
| 7 | Every code/data section bracketed with `<MIP>_START_SEC_<SEC>` / `<MIP>_STOP_SEC_<SEC>` + `#include "<Ma>_MemMap.h"`. Section names such as `CODE`, `VAR_CLEARED_8`, `VAR_INIT_UNSPECIFIED`, `CONST_32`, `CONFIG_DATA_UNSPECIFIED`. | AUTOSAR_CP_SWS_MemoryMapping | ✅ balanced START/STOP |
| 8 | Compiler abstraction macros (`FUNC`, `P2VAR`, `P2CONST`, `CONSTP2VAR`, `VAR`, `CONST`) in BSW signatures, **as defined for the pinned release**. The site shows both the macro form and its expansion. | AUTOSAR_CP_SWS_CompilerAbstraction | ✅ presence in public headers |
| 9 | Development errors are reported with `Det_ReportError(ModuleId, InstanceId, ApiId, ErrorId)`, guarded by `<MA>_DEV_ERROR_DETECT == STD_ON`; error IDs `<MA>_E_<NAME>` with SWS values. | AUTOSAR_CP_SWS_DefaultErrorTracer + module SWS | ✅ |
| 10 | Production/runtime errors go to DEM (`Dem_SetEventStatus`), **not** DET. | SWS_DiagnosticEventManager; SRS_BSWGeneral | review |
| 11 | Published information: `<MA>_VENDOR_ID`, `<MA>_MODULE_ID`, `<MA>_AR_RELEASE_*_VERSION`, `<MA>_SW_*_VERSION`, plus cross-module version checks in `.c` files. | SRS_BSWGeneral | ✅ |
| 12 | `<Ma>_GetVersionInfo(Std_VersionInfoType* versioninfo)` when configured. | module SWS | ✅ |
| 13 | Cyclic BSW work in `<Ma>_MainFunction[_<Name>]()`, called by the scheduler (SchM), not from ISRs. | SRS_BSWGeneral; SWS_RTE (BSW scheduling) | review |
| 14 | SWCs never include MCAL headers; they access hardware only via RTE → IoHwAb. | EXP_LayeredSoftwareArchitecture | ✅ include-graph check |
| 15 | RTE API names: `Rte_Read_<p>_<o>`, `Rte_Write_<p>_<o>`, `Rte_Call_<p>_<o>`, `Rte_IRead_<re>_<p>_<o>`; runnables `RE_<Swc>_<Name>` (project convention, flagged as such). | AUTOSAR_CP_SWS_RTE | ✅ |
| 16 | No dynamic memory, no recursion, bounded loops with timeouts on every hardware wait. | MISRA C:2012 Rules 21.3, 17.2 (numbers only), project rule | ✅ grep + cppcheck |
| 17 | Every MISRA deviation has a record (rule number, location, justification, approver). | MISRA Compliance:2020 (concept) | ✅ suppressions must reference a record ID |

### 8.4 How the capstone refactor is presented
`capstone-autosar.html` uses a three-column **before / after / why** layout for each change (the
bad-vs-good engine): GPIO write in the logic → `Rte_Write_TurnIndicator_LeftLamp` →
`IoHwAb_SetLamp` → `Pwm_SetDutyCycle`. It ends with a self-review against §8.3, and the
signal-flow walkthrough on `autosar-os-com.html#signal-flow` uses the capstone's real function names.

### 8.5 Self-review process (D11)
No AUTOSAR practitioner is confirmed, so Phase 6 is a **self-review** with hard evidence rules:
1. Every AUTOSAR rule, API signature, type, error code or behaviour shown on the site cites its
   document (`AUTOSAR_CP_SWS_*` / `_SRS_*`, R25-11) **and** requirement ID copied from the PDF.
2. Each ID goes into `tools/autosar-ids.txt` (ID · document · page/section · date read). `check-site.py`
   rejects any `SWS_`/`SRS_` ID on the site or in `autosar/` that isn't listed there.
3. `docs/autosar-self-review.md` logs one row per item: where it appears, the citation, "checked against
   PDF" (date), and whether an "In production (R4.x)" box is needed.
4. The reviewer works through the AUTOSAR self-review checklist in `CLAUDE.md` for every page and
   module before the phase closes.
5. **Optional external expert review:** a slot is kept open (any time after Phase 6), but it
   **doesn't block release**. Findings come in as issues labelled `autosar-review`.

---

## 9. Component / engine work

All engines live in `site/assets/js/engines/*.js`. Each registers on `window.MCU` and is loaded only
by pages that use it. They share `core.js` utilities and `diagrams.js` primitives, follow the
reference conventions (SVG, glass styling, `data-tip`, keyboard support, reduced motion), and take
**plain data objects** so content authors never touch rendering code.

### 9.1 Highlighter extensions (`core.js`)
- `c`: keywords incl. `volatile static inline const restrict _Static_assert`. Types: `uint8_t…`,
  AUTOSAR `uint8 uint16 uint32 boolean Std_ReturnType`, and `*_TypeDef`, `*_ConfigType`.
  Register macros (`RCC_CFGR_SWS_PLL`) are styled as constants by the existing `^[A-Z][A-Z0-9_]{2,}$` rule.
- `asm` (GNU Thumb-2): mnemonics, registers `r0–r15 sp lr pc`, directives `.section .word .thumb_func`, `@` comments.
- `ld`: `MEMORY SECTIONS KEEP ALIGN PROVIDE ENTRY AT >` and the `. =` location counter.
- `cmake`, `sh`/`console` (`$ ` prompt lines, output dimmed), `tcl`, `robot`, `resc`, `yaml`, `json`.

### 9.2 Pinout viewer: `MCU.Pinout(host, opts)`
```js
// data: site/assets/js/data/bluepill-pins.js
window.MCU_DATA.bluepill = {
  board: { name: "Blue Pill", mcu: "STM32F103C8T6", package: "LQFP48", source: "community schematic; DS5319 Table 5" },
  headers: { left: ["PB12","PB13",…,"5V","GND","3V3"], right: […], swd: ["3V3","SWDIO","SWCLK","GND"] },
  pins: {
    PA9:  { lqfp: 30, ft: true,  ref: "DS5319 Table 5", af: ["USART1_TX","TIM1_CH2"], remap: [], notes: "System bootloader TX", examples: ["00","04","12"] },
    PC13: { lqfp: 2,  ft: false, ref: "DS5319 Table 5 note 3", af: ["TAMPER-RTC"], notes: "On-board LED, active-low; 3 mA sink, ≤2 MHz", examples: ["00"] },
    PA13: { …, af: ["SWDIO"], warn: "Do not reconfigure: SWD" }, …
  },
  onboard: [{ id: "led", pin: "PC13", label: "LED (active-low)" }, { id: "boot0", … }, { id: "r10", … }],
};
// API
const v = MCU.Pinout(host, {
  board: "bluepill",
  mode: "functions" | "electrical" | "wiring",   // electrical = colour by FT/non-FT/power
  highlight: ["PA9","PA10"],                      // pins used on this page
  wiring: [{ from: "SWD.SWDIO", to: "stlink.SWDIO", color: "signal" }, …],   // wiring mode draws an ST-Link / module
  example: "00",                                  // filter "used by"
});
v.select("PA9"); v.setMode("electrical"); v.exportSVG();   // exportSVG → used to produce examples/*/wiring.svg
```
Interaction: click/focus a pin → side panel with alternate functions, remap options, FT status
(with source), examples using it, and warnings. A search box filters by function ("USART1", "CAN").

### 9.3 Register / bit-field viewer: `MCU.Register(host, opts)`
```js
// data: site/assets/js/data/regs-stm32f103.js — HAND-AUTHORED from RM0008 for the registers we teach (§2.4);
// addresses, bit positions and widths verified by tools/check-regs.py against third_party/cmsis_device_f1.
window.MCU_DATA.regs = {
  RCC_CFGR: { addr: 0x40021004, reset: 0x00000000, ref: "RM0008 §7.3.2", fields: [
    { name: "SW", bits: [1,0], access: "rw", desc: "System clock switch",
      values: { 0: "HSI", 1: "HSE", 2: "PLL", 3: "not allowed" } },
    { name: "SWS", bits: [3,2], access: "r", desc: "System clock switch status (hardware)" },
    { name: "PLLMUL", bits: [21,18], values: { 0: "×2", …, 7: "×9", … } }, … ] },
  GPIOx_CRH: { addrOf: { GPIOA: 0x40010804, GPIOB: 0x40010C04, GPIOC: 0x40011004 }, … },
  CAN_BTR: …, SCB_CFSR: …, AFIO_MAPR: …, FLASH_ACR: …, USART_BRR: …, DTC_STATUS: { pseudo: true, … },
};
const r = MCU.Register(host, { reg: "RCC_CFGR", value: 0x001D040A, editable: true, show: ["SW","SWS","HPRE","PPRE1","PPRE2","PLLSRC","PLLMUL"],
                               onChange: (v) => {…} });
r.set(0x001D0402); r.value;            // two-way binding with the clock-tree and bit-timing calculators
```
Renders 32 bit cells grouped by field. Clicking a bit toggles it (respecting `access`). Field
dropdowns pick enum values. Shows hex, binary and the C expression
(`RCC_CFGR_PLLMULL9 | RCC_CFGR_PLLSRC | RCC_CFGR_PPRE1_DIV2 | RCC_CFGR_SW_PLL`), and reserved bits
are hatched. Field descriptions are written in our own words with the RM0008 section cited.

### 9.4 Clock-tree configurator: `MCU.ClockTree(host, opts)`
An SVG of the F1 tree (HSI 8 MHz, HSE 4–16 MHz with 8 MHz default, PLLSRC with HSI/2, PLLMUL ×2–×16,
SW mux, AHB/APB1/APB2 prescalers, ADCPRE, USBPRE, ×2 timer multipliers, MCO). Controls are
select boxes on the diagram nodes. Outputs: frequencies on every edge, and limit violations (SYSCLK
> 72, PCLK1 > 36, ADC > 14, USB ≠ 48) in red with the RM0008 reference. Also outputs the
`FLASH_ACR.LATENCY` needed and the register values, which feed `MCU.Register`. Spec data lives in
`clocktree-f1.js` so the engine stays chip-agnostic.

### 9.5 Waveform renderer: `MCU.Waveform(host, spec)`
A WaveDrom-inspired mini syntax, so authors who know WaveJSON feel at home, rendered with
our own SVG and theme tokens. There's no external library, which keeps the zero-dependency rule.
```js
MCU.Waveform(host, { signals: [
  { name: "TX", wave: "1.0========1.", data: ["S","D0","D1","D2","D3","D4","D5","D6","D7","P"], },
], hscale: 1, annotations: [{ at: 1, text: "start bit" }] });
// Generators (pure functions, unit-tested in tests/site/*.test.mjs with node --test):
MCU.Wave.uart({ byte: 0x48, baud: 115200, bits: 8, parity: "none", stop: 1 });
MCU.Wave.spi({ mode: 0..3, mosi: [0x9F], miso: [0xEF,0x40,0x17] });
MCU.Wave.i2c({ addr: 0x3C, rw: 0, bytes: [0x00, 0xAF], acks: "auto" });
MCU.Wave.pwm({ arr: 999, ccr: 250, periods: 3 });
MCU.Wave.can({ id: 0x3A0, ide: 0, dlc: 2, data: [0x05,0x00] });   // computes CRC-15 and stuff bits, marks them
```
Interactive pages bind controls (sliders/selects) to generator arguments and re-render. The CAN
generator marks each field (SOF, ID, RTR, …, CRC, ACK) as a coloured band, and stuff bits get a
distinct style. It's validated against a reference implementation in the unit tests.

### 9.6 AUTOSAR explorer and signal flow (reuse)
- **Explorer:** `MCU.Diagram.layered(host, AUTOSAR_BSW)`, with spec in `data/autosar-bsw.js`.
  Bands: `ASW`, `RTE` (boundary band, rendered like the reference's Treble line), `Services`,
  `ECU Abstraction`, `MCAL`, `Microcontroller`. A vertical `Complex Drivers` column is added as a
  node spanning bands (`rows` + `at`). Nodes carry `tip` and `href` (click → the module page section).
  Two **overlay modes** (new small extension): "highlight what is generated in production" and
  "highlight what we hand-write on the Blue Pill".
- **Signal flow:** `MCU.SequenceDiagram` with lanes `Pot/ADC hw · Adc · IoHwAb · RTE · TurnLight SWC
  · RTE · Com · PduR · CanIf · Can · bus`. Steps carry `code` snippets taken from
  `capstone/turnlight/stage3-autosar` via the embed tool, plus an analogy per step, matching the
  reference's HVAC flow. Legend kinds: `call`, `rte`, `pdu`, `bus`, `ret`.

### 9.7 Memory-map / linker visualizer: `MCU.MemoryMap(host, opts)`
```json
// site/assets/js/data/memmap/00-bluepill-blink-uart.js (window.MCU_DATA.memmap[name] = …) — generated by tools/elf2memmap.py (CI-checked)
{ "elf": "00-bluepill-blink-uart.elf", "toolchain": "15.2.Rel1",
  "regions": [{ "name": "FLASH", "origin": 134217728, "length": 65536 }, { "name": "RAM", "origin": 536870912, "length": 20480 }],
  "sections": [{ "name": ".isr_vector", "vma": 134217728, "lma": 134217728, "size": 268 }, { "name": ".data", "vma": 536870912, "lma": 134218904, "size": 12 }, …],
  "symbols": [{ "name": "_estack", "value": 536891392 }, { "name": "Reset_Handler", "value": 134218001, "size": 92 }, …] }
```
Renders two vertical bars (FLASH, RAM) at true scale, with a zoom lens for small sections. Hovering a
section shows size/address. An animation plays "startup copies `.data` LMA→VMA, zeroes `.bss`",
stepping in sync with an annotated `startup.c` (the explorer's `onStep` hook). Stack/heap are drawn
from linker symbols, with an overflow warning when `_Min_Stack_Size + .data + .bss > RAM`.

### 9.8 Code embedding (`tools/embed-code.py`)
- In a page:
  `<script type="text/plain" data-src="examples/00-bluepill-blink-uart/bare/src/main.c" data-lines="12-58" data-lang="c" data-file="main.c" id="src-main"></script>`.
- The tool reads the file, extracts the line range (or a named region between `// [region:clock]` …
  `// [endregion]` comments, which is preferred because it survives edits), and writes the content
  into the tag. It also adds `data-sha` (git blob SHA of the source file).
- `--check` (in CI) fails when any embedded block differs from its source, a `data-src` is missing,
  or a region doesn't exist. Because the output is committed, pages work straight from `file://`
  with no build, as in the reference.
- Markers: real sources carry `// «3»` (C), `@ «3»` (asm), `/* «3» */` (ld), `# «3»` (CMake/tcl/robot)
  at line end. `parseMarks` strips the whole marker comment, and the compiler ignores it.

### 9.9 Smaller new components
- **`MCU.Compare(host, {bad, good, rule, why})`**: side-by-side bad/good blocks (both from
  `examples/…/review-gallery/*.c`, which **compile** too, with the bad one under `-Wno-…` where
  needed) and a badge row such as "MISRA C:2012 Rule 10.4 (paraphrased)" / "SWS_MemoryMapping".
- **`MCU.StateMachine(host, spec)`**: promoted from the reference's page-specific power state
  machine into a generic engine (`states`, `transitions`, `info`). Used for RTOS task states, CAN
  error states, the I2C event sequence, the turn-signal FSM and power modes.
- **`MCU.Checklist(host, items, {key})`**: "You are done when…", progress persisted in
  `localStorage` (`mcu-done-<page>`), wrapped in try/catch, with a reset button.
- **`MCU.Calc`**: BRR calculator, CAN bit-timing calculator (bitrate, PCLK1, sample point →
  BRP/TS1/TS2/SJW and the `CAN_BTR` value, with candidates ranked by sample-point error) and the
  timer PSC/ARR solver.
- **References upgrade:** `R` entries become `{ t, url, doc, rev, sec, kind }`. The page renders doc ID
  + revision badges, and `kind: "community"` gets a visible badge. `check-site.py` requires every
  page to have ≥ 3 primary (non-community) sources.
- **`callout prod`**: new callout kind (🏭 "In production (R4.x)") for §8.1. It needs a `doc`
  attribute naming the R4.x document it compares against, and `check-site.py` enforces that.
- **UI strings:** engines and `core.js` never hard-code user-visible text; they read
  `MCU_STRINGS.<engine>.<key>`. Content text stays in the HTML.
- **OS tabs** for setup steps: reuse `data-tabs`, remember the choice (`mcu-os`), and auto-select from
  `navigator.userAgentData?.platform || navigator.platform` on first visit.

### 9.10 Engine testing
Pure functions (wave generators, CRC-15, bit-timing solver, clock-tree math, BRR) live in
`engines/*.js` (and `lib/code.js`) as UMD-lite modules and are tested with `node --test tests/site/*.test.mjs` in CI. That adds no
dependencies, since Node ships on GitHub runners. Rendering is smoke-tested with **Playwright** (D7):
`tests/site/smoke.spec.mjs` opens every page from `SITE` plus `index.html` in Chromium, in both themes,
and fails on any console error, uncaught page error or failed same-origin request. It also clicks
through each interactive engine once (next step, toggle a bit, change a select).

---

## 10. CI plan

### 10.1 `ci.yml` (on pull_request + push)
| Job | What it does | Blocking |
|---|---|---|
| `examples` (matrix over `examples/*/` and `capstone/*/stage*`) | Install the toolchain from `tools/versions.json` (cached tarball from developer.arm.com, or xPack via `xpm`). `cmake --preset bluepill-release -S <ex>`, then build. Fail if any warning appears (`-Wall -Wextra -Werror` for our code; vendored code compiled with its own flags). Upload `.elf/.map/.hex` + `size` output. | ✅ |
| `memmap-check` | Run `tools/elf2memmap.py` on the built ELFs and diff against `site/assets/js/data/memmap/`. | ✅ |
| `renode-tests` | Install Renode 1.17.0 (pinned package; or `antmicro/renode-test-action` pinned by commit SHA). Run every `examples/*/test/*.robot` with the built ELFs. | ✅ |
| `host-tests` | `cmake --preset host-tests`, then `ctest --output-on-failure` (Unity). Optional gcovr summary in the job log. | ✅ |
| `static-analysis` | cppcheck 2.22 with `--addon=misra` on `examples/`, `autosar/`, `capstone/` (MISRA C:2012 numbering incl. amendments; no rule-texts file, so it outputs rule numbers only). Run `tools/check-autosar.py` and `clang-format --dry-run --Werror`. | Non-blocking until Phase 5, then blocking for `autosar/` and `capstone/stage3*` |
| `third-party` | Every `third_party/*/` has LICENSE + README with URL, tag and SHA; versions match `tools/versions.json`; nothing outside `third_party/` vendors upstream code. | ✅ |
| `browser-smoke` | `npm ci --prefix tests/site`, `npx playwright install --with-deps chromium`, serve `site/` with `python3 -m http.server`, run `smoke.spec.mjs` (§9.10). | ✅ |
| `site-checks` | `tools/check-site.py` (SITE ↔ section ids, ready/planned pages, REFS ≥ 3 primary, local links + anchors, `?v=__BUILD__` on assets, no `TODO`/`lorem`, identical light-token blocks, `callout prod` has `data-doc`, images ≤ 150 KB, SPDX headers, SHA-pinned actions, AUTOSAR IDs listed); `tools/embed-code.py --check`; `tools/check-regs.py`; `tools/hero-art.py --check`; `tools/update-third-party.py --check`; `python3 -m unittest discover -s tests/tools`; `node --test tests/site/*.test.mjs`. Internal links are checked by check-site.py and again, after JavaScript renders, by the Playwright smoke test (no separate lychee offline run). | ✅ |

### 10.2 `pages.yml` (push to `main`)
1. Checkout, then assemble `_site/` = `site/` + `examples/` (sources only, no build dirs) + `capstone/` + `autosar/`.
2. Stamp `__BUILD__` in `_site/*.html` (same `sed` + guard as the reference).
3. `actions/configure-pages`, `upload-pages-artifact` (path `_site`), `deploy-pages`.
   **Every action in every workflow is pinned by full commit SHA with the version as a comment**
   (`uses: actions/checkout@<40-hex-sha> # v4.2.2`). `.github/dependabot.yml` (ecosystems
   `github-actions` and `npm` in `/tests/site`, weekly, grouped) proposes the bumps, and `check-site.py`
   rejects a `uses:` line without a SHA (D9).
4. `needs:` the `ci.yml` checks via `workflow_run`, or by repeating the `site-checks` job, so a red
   build never deploys.

### 10.3 `links-weekly.yml`
A scheduled `lychee` run against external URLs (st.com, autosar.org, arm.com, docs). It opens or
updates an issue instead of failing PRs, because vendor sites are flaky and sometimes block bots.

---

## 11. Phased roadmap

Effort is in focused author-days (one person + Claude sessions). The MVP is Phases 0–2.

| Phase | Deliverables | Exit criteria | Effort |
|---|---|---|---|
| **0. Verification & spikes** | Decisions are done (§12.2). Verify 📄 items against PDFs (DS5319 Table 5, RM0008 sections, ES096, UM1850). Pin st.com tool versions. Re-check the SVD licence on st.com (§2.4). Renode spike: RCC overlay, 20 KB SRAM, STMCAN + CANHub, GenericSpiFlash, ADC model, FLASH stub. CubeMX CMake generation check. Toolchain install dry-run on Windows/Linux/macOS. Buy a genuine-ST Blue Pill, a clone and two SN65HVD230. | `tools/versions.json` filled; spike notes in `docs/spikes.md`; every 📄 resolved | 2–3 |
| **1. Site foundation** | `site/` with ported runtime (`window.MCU`, data-driven nav/footer, `strings.js`, new keys), consolidated CSS + new palette, C/asm/ld/cmake/console highlighting, upgraded references + `callout prod`, `embed-code.py`, `check-site.py`, `check-regs.py` skeleton, `LICENSE` (MIT) + `LICENSE-CONTENT` (CC BY 4.0), `third_party/` vendored (CMSIS core, cmsis-device-f1, Unity) + `update-third-party.py`, `ci.yml` (site-checks, third-party, browser-smoke), `pages.yml`, `dependabot.yml`, SHA-pinned actions, landing page (hero with Blue Pill subtitle, path, module grid, mental model, CTA), `tools/hero-art.py` Blue Pill concept, glossary page with first ~60 terms, `new-module.py` | Pages deploys; Playwright smoke green; Lighthouse a11y ≥ 95 (done: axe-core WCAG 2 A/AA + best-practice, 0 violations, both themes) | 4–5 |
| **2. MVP: Setup module** | `examples/common/*` (toolchain file, linker, C startup, OpenOCD cfgs, Renode overlay); `fetch-svd.py`; examples **00 (bare + hal), 01, 02** with README, wiring, expected output, Robot tests; `setup.html` complete (all 15 sections incl. "What CMake generates under the hood", 3 OS tabs); `troubleshooting.html`; `board.html`; engines **Pinout v1, Register v1 (hand-authored data + check-regs), MemoryMap v1, Checklist**; CI jobs examples/renode/memmap green | The author, following only the site on a clean machine, reaches "Hello from Blue Pill" on hardware **and** in Renode on ≥ 2 OSes | 7–9 |
| **2b. Beta round 1** (non-blocking) | 2–3 junior engineers work through Module 02 using `docs/beta-feedback-template.md` (§11.1). Findings become issues labelled `beta`. | Feedback collected; fixes scheduled. **Releases don't wait for it.** | 1 (author time) |
| **3. From reset to main** | Modules 01, 03–07; examples 03 + 04 (+ host tests); engines ClockTree, Waveform (uart, pwm), Calc (BRR, PSC/ARR), StateMachine | All sections filled, every module with diagram + annotated code + analogy + sources | 8–10 |
| **4. Peripherals** | Modules 08–13; examples 05–09, 11 (two-node CAN on hardware + Renode CANHub); Waveform (i2c, spi, can); CAN bit-timing calculator | CAN demo works between 2 physical boards | 10–12 |
| **5. Embedded engineering** | Modules 14–17; examples 10, 12; `third_party/freertos_kernel`; `host-tests` + `static-analysis` jobs; CMock if a test needs it; bad-vs-good gallery v1; deviation template | cppcheck MISRA job blocking for new code | 8–10 |
| **6. AUTOSAR track** | Modules 18–23; `autosar/` library (Std/Platform types, Compiler, MemMap, Det, Mcu, Port, Dio, Pwm, Adc, Gpt, Wdg, Can, CanIf-lite, PduR-lite, Com-lite, Dem-lite, EcuM-lite, WdgM-lite, `os_shim`); AUTOSAR explorer + overlays; signal-flow walkthrough; "In production (R4.x)" boxes; `check-autosar.py`; `autosar-ids.txt`; optional `tools/rte-gen` | **Self-review complete (§8.5):** every AUTOSAR item cited with document + requirement ID, `docs/autosar-self-review.md` fully ticked, CLAUDE.md AUTOSAR checklist passed for every page | 12–15 |
| **6b. External expert review** (optional, non-blocking) | Slot for an OEM/Tier-1 practitioner to review modules 18–23 + `autosar/`; findings as `autosar-review` issues | — (doesn't gate release) | 1–2 (if it happens) |
| **7. Capstone** | `capstone/turnlight` stages 1–3 + cluster node; requirements, architecture, CAN matrix, acceptance tests; modules 24–26 | Same Robot suite passes for all three stages; hardware checklist signed off | 10–12 |
| **8. Polish & extras** | Appendix C (automotive MCUs), Appendix D (LL drivers, with `00/ll`), optional example **13 LIN two nodes** + its `can.html#lin` link, glossary completion (~200 terms), accessibility + mobile pass, performance budget (each page ≤ 400 KB excluding fonts), proofreading, contributor docs; beta round 2 (non-blocking) on one peripheral module + one AUTOSAR module | Checks green; beta-2 feedback triaged | 5–6 |
| **M. R26-11 review** (milestone, when R26-11 is published) | Diff every cited R25-11 document against R26-11; list changed requirement IDs/APIs in `docs/autosar-r26-11-review.md`; decide whether to re-pin. **No automatic re-pin** (D4). | Decision recorded in PLAN.md §8.1 | 1–2 |
| **Backlog** | Trampoline (open-source OSEK/AUTOSAR OS) as an optional advanced appendix; contributing `STM32F1_RCC` upstream to Renode | — | — |
| **Total (core phases 0–8)** | | | **≈ 66–82 days** (MVP = phases 0–2 ≈ 13–17) |

### 11.1 Beta feedback template (`docs/beta-feedback-template.md`)
One copy per participant per module, with these fields: participant background (years of C, embedded
yes/no), OS, hardware (genuine/clone Blue Pill, ST-Link type); **time spent per section**; **where you
got stuck** (section id + what you tried); **what was unclear** (quote the sentence); errors seen
(copy/paste); "I had to search elsewhere for…"; clarity 1–5 per section; one thing to remove, one to
add. Results are summarised in an issue per round. Rounds run after the MVP (2b) and in Phase 8, and
**never block a release**.

### 11.2 Progress log

**Phase 1 — site foundation (2026-10-24).** Started at the owner's request before Phase 0, so Phase 0's
hardware and PDF verifications are still open (they don't block the site foundation).
- Built: `site/` runtime ported to `window.MCU` (`strings.js`, `lib/code.js`, `core.js`, `diagrams.js`),
  consolidated `main.css` with the copper/signal palette, landing page with the Blue Pill hero art
  (`tools/hero-art.py --write`), glossary page with 79 terms, all 31 SITE entries (`status: "planned"` pages
  are shown with their phase and never linked), licences, `third_party/` (CMSIS 6 core, cmsis-device-f1,
  Unity) with `update-third-party.py`, `embed-code.py`, `check-site.py`, `check-regs.py` (header self-test:
  12 RM0008 facts reproduced from `stm32f103xb.h`, including the `FLASH_ACR_LATENCY_2` trap), `new-module.py`,
  CI (`ci.yml`, `pages.yml`, `links-weekly.yml`, `dependabot.yml`), all actions SHA-pinned.
- Verified locally: check-site, embed-code, check-regs, hero-art, third-party checks; 10 Python tool tests;
  6 Node runtime tests; 7 Playwright smoke tests; axe-core 0 violations on both pages in both themes.
  Lighthouse itself was not run (axe-core is the engine behind its accessibility score).
- Deviation from §9: the generic `MCU.StateMachine` and other engines are Phase 2+ as planned; the reference's
  cabin-topology component was dropped. Engines that no page uses yet are exercised by
  `tests/site/fixtures/engines.html`.
- Publishing: Pages deploys from `main` via `pages.yml`; the repository owner must set
  Settings → Pages → Source = "GitHub Actions" once.

---

## 12. Risks, decisions and remaining questions

### 12.1 Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Clone chips behave differently (flash, ADC, I2C) | Learners think the course is wrong | "Tested on" table per example; genuine-ST board as reference; clone notes on `board.html` |
| Renode gaps (RCC, ADC, flash controller) need more custom modelling than planned | MVP slips | Phase-0 spike first; fall back to "hardware only" labels instead of half-correct simulation |
| Tool download sites (developer.arm.com, st.com) change URLs or block CI | CI red for reasons that aren't code | Cache toolchain tarballs as workflow cache; prefer xPack mirrors on GitHub releases; SVD fetch has a pinned fallback mirror |
| AUTOSAR content judged "not real AUTOSAR" by practitioners | Credibility | Banners + honest generated/hand-written labels; every item cited with SWS/SRS ID; self-review log (§8.5); optional external review slot |
| No external AUTOSAR reviewer (D11) | Subtle mistakes survive | Evidence rule (no ID, no claim), `autosar-ids.txt` check in CI, issue label for reader reports |
| SVD licence stays unclear | Cortex-Debug setup has one extra step | `fetch-svd.py` step with a "Verify" check; register viewer doesn't depend on the SVD |
| Copyright: MISRA rule texts, AUTOSAR text, ST manual figures | Takedown | Paraphrase only; cite numbers; draw our own diagrams; never embed vendor PDFs or figures |
| Scope creep (26 modules) | Never finishes | Strict phase gates; MVP published first; modules can ship with `🚧` badge only after the MVP |
| Hardware-dependent claims (R10, LED, pins) differ per board vendor | Wrong instructions | "Measure yours" steps; community sources labelled |
| CSS consolidation regresses the look inherited from the reference | Rework | Do it once in Phase 1 with screenshot comparison of 3 reference pages |

### 12.2 Decisions (2026-10-24)
Each decision lists what was decided, why, and where the plan applies it. The former open questions
are mapped as (Qn).

- **D1. Folder and branding** (Q1, Q2): `site/` and **"MCU Academy"**. *Why:* the name is
  board-agnostic, so it still fits if an automotive-grade MCU track is added later. The Blue Pill focus
  is stated in the hero subtitle. *Applied:* §1.3, §2.
- **D2. Coding style and startup** (Q3, Q4): **plain registers** as the main style, with every register
  definition from the CMSIS device header `stm32f103xb.h` (no hand-typed addresses or bit values in
  firmware). HAL appears only in the setup module's side-by-side comparison. **LL gets one short
  appendix page** (`ll-drivers.html`, Appendix D), not a parallel track. Startup is **written in C**, and
  ST's assembly startup is shown once for comparison (`boot.html#c-vs-asm`). *Why:* registers are what
  every later layer (MCAL!) is built on, and the C startup is readable and teachable. *Applied:* §3
  (`setup`, `boot`, `ll-drivers`), §5 (`00/ll`), CLAUDE.md.
- **D3. Build** (Q5): **CMake + Ninja only, no Makefiles.** One short section,
  `setup.html#cmake-under-hood`, shows what CMake generates (`build.ninja`, `compile_commands.json`,
  the resulting `arm-none-eabi-gcc` command lines). *Why:* one build system to maintain and debug.
  *Applied:* §3, CLAUDE.md.
- **D4. AUTOSAR release** (Q6): **R25-11 for all spec citations.** A recurring "In production (R4.x)"
  box appears wherever an API or behaviour differs from what learners meet in real ECUs. **No automatic
  re-pin** when R26-11 is released; it becomes the separate review milestone "M". *Why:* a stable
  citation base, with the production gap shown openly. *Applied:* §0, §8.1, §9.9, §11.
- **D5. OS for the AUTOSAR stage** (Q7): a **FreeRTOS shim with an OSEK/AUTOSAR-OS-like API** (tasks,
  alarms, events), clearly labelled "not a real AUTOSAR OS". **Trampoline is backlog**: an optional
  advanced appendix, not in the core path. *Why:* the SWC/BSW code reads like real OS-based code
  without porting a second RTOS. *Applied:* §2 (`autosar/os_shim`), §5.2, §8.2, §11.
- **D6. LIN** (Q8): **theory in the core path** (`uart.html#lin-mode`, `can.html#lin`). The optional
  two-Blue-Pill logic-level example 13 is scheduled late (Phase 8) and is not part of the MVP.
  *Applied:* §2, §5.1, §11.
- **D7. Tests** (Q9, Q10): **Unity (+ CMock when mocks are needed), driven by CMake/CTest. No Ceedling**,
  to avoid a Ruby dependency in CI. **Playwright smoke test in CI**: every page loads with zero console
  errors, plus the link check. *Applied:* §2, §6.1, §9.10, §10.1.
- **D8. SVD** (Q11): checked (§2.4). The licence is **unclear** (ST EULA in one copy, an Apache-2.0
  claim in another, no header in the file), so the SVD is **not committed**. `tools/fetch-svd.py`
  downloads it in the setup step, and the register viewer data is **hand-authored from RM0008** for the
  registers we teach, checked against the Apache-2.0 CMSIS header. *Applied:* §2, §2.4, §6.1, §6.3, §9.3.
- **D9. Licences and CI pinning** (Q12, Q13): **MIT** for code (`examples/`, `autosar/`, `capstone/`,
  `tools/`, `tests/`, site JS/CSS); **CC BY 4.0** for prose and diagrams. Vendored code keeps its own
  licence. GitHub Actions are **pinned by full commit SHA with the version as a comment**, and
  **Dependabot** is enabled for actions (and for the npm test dependency). *Applied:* §2, §10.2.
- **D10. MISRA and language** (Q15, Q16): **MISRA C:2012 rule numbering, including its amendments**,
  since that's what industry and the cppcheck addon use. One note (on `quality.html#misra`) explains
  that the later consolidated edition folds the 2012 amendments into one document and keeps the
  Dir/Rule numbering scheme. That note lists any rule we cite whose number or category differs there,
  checked against the edition's own mapping. **Content is English only.** There's no i18n
  infrastructure, but all UI strings live in `site/assets/js/strings.js`, so a Vietnamese version stays
  possible. *Applied:* §1.3, §2, §3.1, §9.9, §10.1.
- **D11. Review and beta** (Q14): no dedicated AUTOSAR practitioner is confirmed, so **Phase 6 is a
  self-review** (§8.5): every AUTOSAR rule or API cites its SWS/SRS document and requirement ID, and
  CLAUDE.md has a checklist for it. An **optional external expert review** slot (6b) never blocks
  release. A **small beta** (2–3 junior engineers) runs after the MVP (2b) with a feedback template
  (§11.1), and it doesn't block releases either. *Applied:* §8.5, §11, CLAUDE.md.
- **D12. Third-party code** (Q17): **vendored into `third_party/`** (CMSIS core + device headers,
  FreeRTOS kernel, Unity, and CMock later), each with a pinned version, its LICENSE and a README with the
  source URL. A small script updates them. **No submodules**, so a ZIP download builds without extra
  steps. *Applied:* §2, §2.3, §10.1.

### 12.3 Remaining questions (none block Phase 1)
- Does ST's own download page or CMSIS pack state a licence for the F1 SVD? Checked in Phase 0 from
  a network that can reach st.com. If it's permissive, vendor it per §2.4 step 3.
- The exact edition and mapping for the MISRA note in D10 is confirmed when `quality.html` is written (Phase 5).

---

## 13. Sources consulted for this plan

- Reference site: `github.com/Thuongst97/Android-Knowledge` @ `0ac7026` (`aaos14-academy/`, `tools/hero-art.py`, `.github/workflows/pages.yml`).
- Renode platform file `platforms/cpus/stm32f103.repl` and script `scripts/single-node/stm32f103.resc` (renode/renode, master, 2026-10-24); peripheral models in renode/renode-infrastructure (`STMCAN.cs`, `STM32SPI.cs`, `STM32_ADC.cs`, `STM32_IndependentWatchdog.cs`, `STM32F1_I2C.cs`, `GenericSpiFlash.cs`, `CANHub.cs`, `PythonPeripheral.cs`).
- OpenOCD `tcl/target/stm32f1x.cfg`, `tcl/board/stm32f103c8_blue_pill.cfg`, `tcl/interface/stlink.cfg` (openocd-org/openocd master, 2026-10-24).
- STMicroelectronics `cmsis-device-f1` v4.3.5: `Include/stm32f103xb.h`, `Source/Templates/gcc/linker/STM32F103XB_FLASH.ld`, `License.md`.
- xPack QEMU Arm release notes v7.1.0-1 (2022) and v9.2.4-1 (2025-10-09).
- Upstream tags (`git ls-remote`, 2026-10-24) for Renode, OpenOCD, xPack GCC/OpenOCD/QEMU, FreeRTOS-Kernel, STM32CubeF1, CMSIS 6, Unity, CMake, Ninja, Cppcheck, pyOCD, GoogleTest, lychee.
- SVD licence check (§2.4): `cmsis-svd/cmsis-svd-data` (`data/STMicro/License.html`, `STM32F103xx.svd`) and `modm-io/cmsis-svd-stm32` (`README.md`, `LICENSE.md`, `stm32f1/STM32F103.svd`), both read 2026-10-24.
- Tags for CMock (v2.7.0) and Playwright (1.64.1, npm registry), 2026-10-24.
- AUTOSAR CP R25-11 Release Overview (autosar.org, 2025-11-27) and release-event page.
- Community reports on CKS32/CS32 IDCODE `0x2ba01477` (PlatformIO forum, EEVblog) and the R10 USB pull-up (Hackaday.io, mikrocontroller.net, Arduino forum). Used only for the "community" claims above.
- To verify in Phase 0 (st.com unreachable from this session): DS5319, RM0008, PM0056, PM0075, ES096, AN2606, AN3155.
