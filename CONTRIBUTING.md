# Contributing to MCU Academy

Thanks for helping. The most useful contributions right now are the ones that close items in
[`docs/verification.md`](docs/verification.md): running an example on a real NUCLEO-G474RE, checking a cited
section number against the PDF, or copying an AUTOSAR requirement ID from the R25-11 specification.

Read [`CLAUDE.md`](CLAUDE.md) first. Its hard rules apply to human and AI authors alike, and CI
enforces most of them.

## Report a problem

Open an issue with the page URL and section id (the `#…` part), what the page says, what you
expected, and your source: a document ID and section (`RM0008 §7.3.2`) or what you measured on
your board. For hardware reports, say whether your chip is a genuine ST part or a clone
(see `board.html#quirks`).

## Confirm an example on hardware

1. Build and flash it as its `README.md` says, wire it as its `wiring.svg` shows.
2. Compare the UART output with `expected-output.txt` and work through the page's
   "You are done when…" checklist.
3. Add your board to `tested_on` in the example's README front matter (for example
   `"NUCLEO-G474RE (MB1367), ST-LINK/V3E firmware V3J…, Linux"`) and note anything that differed.
4. Run `python3 tools/gen-catalog.py` and open a pull request.

## Verify a citation

- **ST/Arm documents:** fix the `sec` field of the `R` entry in `site/assets/js/core.js`. Keep claims
  in your own words; never copy figures, tables or long text (CLAUDE.md rule 9).
- **AUTOSAR:** copy the requirement ID from the R25-11 PDF into `tools/autosar-ids.txt`
  (ID · document · section/page · date read), cite it where the claim appears, and tick the row in
  `docs/autosar-self-review.md`. Never write an ID from memory (rule 13b).
- **MISRA:** cite rule numbers only and paraphrase (rule 7).

## Change a page or an example

- Pages are plain HTML + JavaScript; there is no build step. Code shown on a page is embedded from
  `examples/`, `autosar/` or `capstone/` with `tools/embed-code.py`, never pasted.
- New modules go through `python3 tools/new-module.py <id>`; new examples follow
  "How to add a new example" in CLAUDE.md.
- UI text belongs in `site/assets/js/strings.js`; tool versions belong in `tools/versions.json`.

Before you open a pull request, run the checks listed in the [README](README.md#checks-the-same-ones-ci-runs).
CI runs the same ones plus the firmware build, host tests and the MISRA ratchet.

## Licences

By contributing you agree that code is released under [MIT](LICENSE) and prose and diagrams under
[CC BY 4.0](LICENSE-CONTENT). Every new code file starts with `SPDX-License-Identifier: MIT`.
