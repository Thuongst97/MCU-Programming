---
id: "13"
title: LIN between two NUCLEO boards (UART level)
modules: [uart, can]
peripherals: [USART1 (LIN mode), LPUART1, GPIOA, GPIOC]
flavor: bare-metal (CMSIS registers)
pins: [PA9, PA10, PC13, PA5, PA2, PA3]
hw: [2 × NUCLEO-G474RE, 2 small-signal diodes (1N4148), 1 kΩ resistor]
tested_on: []
---
# 13 — LIN, two nodes (optional)

A LIN cluster without 12 V transceivers: each node's TX (PA9 = D8) drives a shared wire through a
diode (cathode to TX), the wire has one 1 kΩ pull-up to 3V3, and each RX (PA10 = D2) reads the
wire. That gives LIN's wired-AND (dominant = low) at logic level. Connect the two GNDs.
USART1 does the LIN work; LPUART1 (the virtual COM port) has no LIN mode and carries the log.

- **Master** (`13-lin-master`): every 50 ms a frame from its schedule table. Slot A: header with
  ID 0x10, the slave answers with its USER button state. Slot B: header with ID 0x20 plus the LED
  command.
- **Slave** (`13-lin-slave`): detects the break (`ISR.LBDF`, cleared through `ICR`), reads sync
  and PID, checks the PID parity, answers 0x10, listens to 0x20 and drives its LED.

Both read back every byte they send (a single-wire bus echoes it), and compare: a different echo
means another node drove the bus at the same time.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## How this was verified
- ✅ Builds in CI; PID and checksum logic are unit-tested on the host (`test/test_lin.c`).
- ❌ Not run on two NUCLEO-G474RE boards yet.
