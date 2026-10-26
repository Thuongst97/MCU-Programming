# TurnLight: the capstone body ECU (modules 24–26)

One turn-signal / hazard ECU, built three times with the same behaviour:

| Stage | Folder | Integration | Page |
|---|---|---|---|
| 1 | `stage1-baremetal/` | cooperative scheduler (example 02), drivers from examples 01, 11 and `hw/` | `capstone-baremetal.html` |
| 2 | `stage2-freertos/` | five FreeRTOS tasks, a queue, a mailbox, event groups | `capstone-rtos.html` |
| 3 | `stage3-autosar/` | two SWCs, a hand-written RTE, `autosar/` BSW and MCAL, the OS shim | `capstone-autosar.html` |

Shared by all stages: `logic/` (the state machine, lamp monitor and message packing, pure C with
host tests in `logic/test/`). Stages 1 and 2 share `hw/` (the register-level board layer). The
second board runs `cluster/`, which shows the telltales on the SSD1306 OLED and acknowledges the
status frame.

- Requirements: [`docs/requirements.md`](docs/requirements.md)
- CAN matrix (hypothetical IDs): [`docs/can-matrix.md`](docs/can-matrix.md)
- Acceptance: [`docs/acceptance.md`](docs/acceptance.md). There is no simulator for the STM32G4, so
  the logic is host-tested (`logic/test/`) and the integration is checked on two NUCLEO-G474RE boards.

```sh
cmake --preset nucleo-debug && cmake --build --preset nucleo-debug
cmake --preset host-tests && ctest --preset host-tests             # logic/test runs here
cmake --build --preset nucleo-debug --target flash-tl-stage1-baremetal   # or -stage2-freertos / -stage3-autosar
cmake --build --preset nucleo-debug --target flash-tl-cluster            # the second board
```

## Wiring (ECU node, NUCLEO-G474RE)
PB12 / PB13 / PB14 (Morpho header): left stalk, right stalk, hazard buttons to GND. PA6 (D12) /
PA7 (D11): left / right lamp (LED + 330 Ω to GND). PA1 (A1): potentiometer wiper (lamp current
stand-in), ends to 3.3 V and GND. PA11 / PA12 (Morpho header): FDCAN1 RX / TX to a 3.3 V CAN
transceiver rated for CAN FD (CANH/CANL to the cluster node, 120 Ω at each end; the NUCLEO has no
transceiver). The log goes to the ST-LINK virtual COM port (LPUART1, PA2/PA3): no extra wiring.
LD2 (PA5) is the heartbeat.

## Wiring (cluster node, a second NUCLEO-G474RE)
PA11 / PA12 to its own transceiver; SSD1306 on PA9 (D8, SCL) / PA8 (D7, SDA), as in example 06.
Hold B1 (USER) to stop acknowledging, to test TL-REQ-007.

## How this was verified
- ✅ All stages and the cluster node build in CI with `-Wall -Wextra -Werror`.
- ✅ The logic (`logic/`) passes its host tests.
- ⚠️ No simulator: Renode has no STM32G4 model.
- ❌ Not run on NUCLEO-G474RE boards yet.
