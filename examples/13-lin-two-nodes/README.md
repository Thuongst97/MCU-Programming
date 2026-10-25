---
id: "13"
title: LIN between two Blue Pills (UART level)
modules: [uart, can]
peripherals: [USART2 (LIN mode), USART1, GPIOA, GPIOC]
flavor: bare-metal (CMSIS registers)
pins: [PA2, PA3, PA0, PC13, PA9, PA10]
hw: [second Blue Pill, 2 small-signal diodes (1N4148), 1 kΩ resistor, push button from PA0 to GND on the slave]
sim: none
tested_on: []
---
# 13 — LIN, two nodes (optional)

A LIN cluster without 12 V transceivers: each node's TX (PA2) drives a shared wire through a
diode (cathode to TX), the wire has one 1 kΩ pull-up to 3.3 V, and each RX (PA3) reads the wire.
That gives LIN's wired-AND (dominant = low) at logic level. Connect the two GNDs.

- **Master** (`13-lin-master`): every 50 ms a frame from its schedule table. Slot A: header with
  ID 0x10, the slave answers with its button state. Slot B: header with ID 0x20 plus the LED command.
- **Slave** (`13-lin-slave`): detects the break (`LBD`), reads sync and PID, checks the PID parity,
  answers 0x10, listens to 0x20 and drives its LED.

Both read back every byte they send (a single-wire bus echoes it), and compare: a different echo
means another node drove the bus at the same time.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## Simulation fidelity
- ✅ PID and checksum logic: host tests (`test/test_lin.c`).
- ❌ No Renode test: Renode's USART model does not generate or detect a LIN break.
- ❌ Not tested on Blue Pills yet.
