# MCU-Programming — MCU Academy

An interactive learning site that takes software engineers from "what is a microcontroller?" to
AUTOSAR-structured automotive firmware. Every example targets the **STM32F103C8T6 "Blue Pill"**
programmed with an **ST-Link V2**, and can also run without hardware in **Renode**.

**Status:** Phase 1 (site foundation) is done: landing page, glossary, the shared runtime, tools and CI.
The first hands-on module, *Setting Up and Running a Program on STM32F103C8T6 Blue Pill*, is Phase 2.
See [`PLAN.md`](PLAN.md) for the design, curriculum and roadmap (§11.2 has the progress log) and
[`CLAUDE.md`](CLAUDE.md) for the authoring rules.

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
python3 tools/hero-art.py --check        # landing illustration is up to date
python3 tools/update-third-party.py --check
python3 -m unittest discover -s tests/tools
node --test tests/site/*.test.mjs
npm ci --prefix tests/site && npm --prefix tests/site run smoke   # Playwright browser smoke test
```

## Repository layout

| Path | What |
|---|---|
| `site/` | The static site deployed to GitHub Pages (HTML, `assets/css/main.css`, `assets/js/`) |
| `tools/` | Authoring and check tools; `versions.json` pins every tool and library version |
| `third_party/` | Vendored CMSIS core, STM32F1 device headers and Unity (no submodules) |
| `tests/` | Tool tests (Python) and site tests (Node + Playwright) |
| `.github/workflows/` | CI, Pages deploy, weekly external link check |
| `examples/`, `autosar/`, `capstone/` | Firmware, from Phase 2 on |

## Publishing

`pages.yml` deploys `site/` on every push to `main` after the CI checks pass. One-time setup by the
repository owner: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Licences

Code (including site JavaScript and CSS) is [MIT](LICENSE). Prose and diagrams are
[CC BY 4.0](LICENSE-CONTENT). Code in `third_party/` keeps its upstream licence.
