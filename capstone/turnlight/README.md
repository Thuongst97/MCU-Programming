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
- Acceptance: [`docs/acceptance.md`](docs/acceptance.md); the Renode suite is `test/turnlight.robot`, run
  against every stage.

```sh
cmake --preset bluepill-debug && cmake --build --preset bluepill-debug
python3 tools/run-renode-tests.py capstone/turnlight/test/turnlight.robot
cmake --build build/bluepill-debug --target flash-tl-stage1-baremetal    # or -stage2-freertos / -stage3-autosar
cmake --build build/bluepill-debug --target flash-tl-cluster              # the second board
```

## Wiring (ECU node)
PB12 / PB13 / PB14: left stalk, right stalk, hazard buttons to GND. PA6 / PA7: left / right lamp
(LED + 330 Ω to GND). PA1: potentiometer wiper (lamp current stand-in), ends to 3.3 V and GND.
PB8 / PB9: CAN RX / TX to an SN65HVD230 (CANH/CANL to the cluster node, 120 Ω at each end).
PA9 / PA10: USB-UART for the log.

## Wiring (cluster node)
PB8 / PB9 to its own SN65HVD230; SSD1306 on PB6 (SCL) / PB7 (SDA); optional button PA0 to GND
(hold to stop acknowledging, to test TL-REQ-007).
