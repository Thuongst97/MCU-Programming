# third_party/

Vendored upstream code, pinned in [`tools/versions.json`](../tools/versions.json). A ZIP download of
this repository builds offline: there are no git submodules and no CMake `FetchContent`.

| Component | Upstream | Version | Licence | Used by |
|---|---|---|---|---|
| [`cmsis_core`](cmsis_core/) | ARM-software/CMSIS_6 | see `tools/versions.json` | Apache-2.0 | all firmware (`core_cm3.h`) |
| [`cmsis_device_f1`](cmsis_device_f1/) | STMicroelectronics/cmsis-device-f1 | see `tools/versions.json` | Apache-2.0 | all firmware (`stm32f103xb.h`) |
| [`unity`](unity/) | ThrowTheSwitch/Unity | see `tools/versions.json` | MIT | host unit tests |

Planned later: `freertos_kernel` (Phase 5), `cmock` (only when a test needs mocks).

Rules (CLAUDE.md rule 10):
- Never edit files here. Each folder has the upstream LICENSE and a README with URL, tag, commit and file hashes.
- Update with `python3 tools/update-third-party.py <component> <tag>`; CI runs `--check`.
- The STM32F103 SVD is deliberately **not** here (licence unclear, PLAN.md §2.4).
