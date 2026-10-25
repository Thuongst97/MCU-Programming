---
id: "11"
title: Two Blue Pills on a CAN bus
modules: [can]
peripherals: [bxCAN, AFIO, GPIOA, GPIOB, NVIC, USART1]
flavor: bare metal
pins: [PB8, PB9, PA0, PC13, PA9, PA10]
hw: [second Blue Pill, 2 × SN65HVD230 transceiver modules, twisted pair, 2 × 120 Ω (if the modules have none), push button on node A]
sim: partial
tested_on: []
---
# 11 — Two Blue Pills on a CAN bus

bxCAN at 500 kbit/s (PCLK1 = 36 MHz, BRP = 4, 1 + 15 + 2 = 18 time quanta, sample point 88.9 %,
`CAN_BTR = 0x001E0003`) on PB8/PB9 (AFIO `CAN_REMAP = 10`, leaving PA11/PA12 for USB).
One filter bank accepts every frame into FIFO 0, which is read by interrupt (IRQ 20, shared with
USB). The same source builds two programs:

- `11-can-node-a`: sends its button (PA0) as frame `0x100` every 100 ms and on every change.
- `11-can-node-b`: drives its LED from `0x100` and answers with frame `0x101`.

Both start with a self-test in **silent loopback** mode, which needs no transceiver and no second
node, and print the error counters every second. All CAN IDs here are **hypothetical**.

## Wiring (each node)
PB9 (CAN_TX) → transceiver D/TXD, PB8 (CAN_RX) ← transceiver R/RXD, 3.3 V and GND to the module.
Transceiver CANH to CANH, CANL to CANL between the two modules (twisted pair), and 120 Ω between
CANH and CANL at each end of the bus. Many SN65HVD230 modules already carry a 120 Ω resistor;
check yours, and never fit more than two on one bus.

## Expected output
See [`expected-output.txt`](expected-output.txt) (node B, button on node A pressed once).

## Simulation fidelity (Renode, two machines joined by a CAN hub)
- ✅ Silent-loopback self-test, frame exchange between the nodes, filters, the RX interrupt.
- ⚠️ Frames only: no bit timing, no transceiver, no ACK slot, no error frames. Error counters stay 0 even with one node alone.
- ❌ Not tested on Blue Pills yet.
