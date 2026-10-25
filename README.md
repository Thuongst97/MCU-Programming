# MCU-Programming — MCU Academy

An interactive learning site that takes software engineers from "what is a microcontroller?" to
AUTOSAR-structured automotive firmware. Every example targets the **STM32F103C8T6 "Blue Pill"**
programmed with an **ST-Link V2**, and can also run without hardware in **Renode**.

**Status:** all 31 pages are written: 26 modules from fundamentals to AUTOSAR (24–26 are the
TurnLight capstone) and five reference appendices, with 14 examples. All firmware builds in CI, and
every example that Renode can simulate passes its Robot test there.
**Nothing has been tested on a real board yet, and AUTOSAR requirement IDs are still to be checked
against the R25-11 PDFs.** [`docs/verification.md`](docs/verification.md) lists exactly what is and isn't
verified. See [`PLAN.md`](PLAN.md) for the design and roadmap (§11.2 has the progress log),
[`CLAUDE.md`](CLAUDE.md) for the authoring rules and [`CONTRIBUTING.md`](CONTRIBUTING.md) to help.

## Preview locally

No build step. Serve the `site/` folder and open it in a browser:

```sh
python3 -m http.server -d site 8000      # then open http://localhost:8000
```

## Checks (the same ones CI runs)

```sh
python3 tools/check-site.py              # SITE ↔ pages, references, links, tokens, SPDX, pinned actions
python3 tools/embed-code.py --check      # code shown on pages matches the files in the repo
python3 tools/check-regs.py              # register data matches ST's CMSIS header
python3 tools/check-budget.py            # every page transfers ≤ 400 KB
python3 tools/check-autosar.py           # AUTOSAR-style conventions in autosar/ and the capstone
python3 tools/hero-art.py --check        # landing illustration is up to date
python3 tools/update-third-party.py --check
python3 -m unittest discover -s tests/tools
node --test tests/site/*.test.mjs
npm ci --prefix tests/site && npm --prefix tests/site run smoke   # Playwright browser smoke test
```

Firmware (needs the Arm GNU toolchain, CMake and Ninja; Renode for the simulation tests):

```sh
cmake --preset bluepill-debug && cmake --build --preset bluepill-debug   # every example + capstone
cmake --preset host-tests && ctest --preset host-tests                   # Unity host tests
python3 tools/run-renode-tests.py                                        # Robot suites in Renode
python3 tools/run-misra.py                                               # MISRA C:2012 ratchet (cppcheck)
```

## Repository layout

| Path | What |
|---|---|
| `site/` | The static site deployed to GitHub Pages (HTML, `assets/css/main.css`, `assets/js/`) |
| `tools/` | Authoring and check tools; `versions.json` pins every tool and library version |
| `third_party/` | Vendored CMSIS core, STM32F1 device headers, Unity and the FreeRTOS kernel (no submodules) |
| `tests/` | Tool tests (Python) and site tests (Node + Playwright) |
| `.github/workflows/` | CI, Pages deploy, weekly external link check |
| `examples/` | Examples 00–13 and `common/` (startup, linker script, BSP, OpenOCD and Renode files) |
| `autosar/` | AUTOSAR-style teaching library (MCAL, ECU abstraction, services, OS shim): not AUTOSAR-conformant |
| `capstone/turnlight/` | The TurnLight capstone: one ECU in three stages plus a cluster node |
| `docs/` | Verification status, AUTOSAR self-review log, MISRA compliance and deviations |

## Publishing

`pages.yml` deploys `site/` on every push to `main` after the CI checks pass. One-time setup by the
repository owner: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Licences

Code (including site JavaScript and CSS) is [MIT](LICENSE). Prose and diagrams are
[CC BY 4.0](LICENSE-CONTENT). Code in `third_party/` keeps its upstream licence.
