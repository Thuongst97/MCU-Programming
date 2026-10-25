---
id: "11"
title: Two NUCLEO boards on a CAN bus, classic and CAN FD frames
modules: [can]
peripherals: [FDCAN1, GPIOA, GPIOC, NVIC, LPUART1]
flavor: bare metal + host unit tests
pins: [PA11, PA12, PC13, PA5, PA2, PA3]
hw: [second NUCLEO-G474RE, 2 × 3.3 V CAN transceiver modules (CAN FD-rated for the FD frames), twisted pair, 2 × 120 Ω (if the modules have none)]
tested_on: []
---
# 11 — Two NUCLEO boards on a CAN bus, classic and CAN FD frames

FDCAN1 on PA11 (RX) / PA12 (TX), clocked from PCLK1 (170 MHz; the reset value of
`RCC_CCIPR.FDCANSEL` would select HSE, which the course does not use). Bit timing is computed,
not pasted: 500 kbit/s arbitration (prescaler 17, 1 + 16 + 3 quanta, sample point 85 %) and
1 Mbit/s data phase, by `src/canfd.c`, which is unit-tested on the host together with the CAN FD
length codes.

No filters are configured: the G4's FDCAN puts every standard frame that matches no filter into
RX FIFO 0 by default (`RXGFC = 0`). FIFO 0 is read by interrupt. The message RAM has a fixed
layout on the G4; the driver writes the TX and reads the RX elements directly. The same source
builds two programs:

- `11-can-node-a`: sends its button (B1) as classic frame `0x100` every 100 ms and on every
  change, and once a second a 16-byte CAN FD frame `0x102` with bit-rate switch.
- `11-can-node-b`: drives its LED from `0x100`, answers with frame `0x101`, prints what it gets.

Both start with a self-test in **internal loopback** mode (`TEST.LBCK` + `CCCR.MON`), which needs
no transceiver and no second node, and print the error counters every second. All CAN IDs here
are **hypothetical**.

## Wiring (each node)
PA12 (FDCAN1_TX) → transceiver TXD, PA11 (FDCAN1_RX) ← transceiver RXD, 3V3 and GND to the module
(both pins are on the Morpho header). CANH to CANH, CANL to CANL between the two modules (twisted
pair), and 120 Ω between CANH and CANL at each end of the bus. Many modules already carry a
120 Ω resistor; check yours, and never fit more than two on one bus.

The NUCLEO has no CAN transceiver. For the CAN FD frames use a module whose transceiver is rated
for CAN FD; SN65HVD230 modules are specified up to 1 Mbit/s for classic CAN (SLOS346) and are
fine for the classic frames.

## Expected output
See [`expected-output.txt`](expected-output.txt) (node B, button on node A pressed once).

## How this was verified
- ✅ Builds in CI; bit timing and CAN FD length codes are unit-tested on the host.
- ✅ AF numbers (FDCAN1 on PA11/PA12 = AF9) checked against ST's pin data; the message-RAM layout
  matches ST's HAL source.
- ❌ Not run on two NUCLEO-G474RE boards yet.
