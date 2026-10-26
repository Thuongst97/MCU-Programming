---
id: "04"
title: Interrupt-driven UART with ring buffers and a command shell
modules: [uart, interrupts]
peripherals: [LPUART1, NVIC, GPIOA]
flavor: bare metal + host unit tests
pins: [PA2, PA3, PA5, PA8]
hw: [NUCLEO-G474RE]
tested_on: []
---
# 04 — Interrupt-driven UART with ring buffers and a command shell

LPUART1, the NUCLEO's virtual COM port, receives and transmits from its interrupt handler. Two
single-producer single-consumer ring buffers (`src/ringbuf.c`) decouple the ISR from `main()`,
which sleeps with `WFI` until a byte arrives and feeds it to a small shell (`src/shell.c`). Both
are unit-tested on the host.

Commands: `help`, `led on|off|toggle`, `clock`, `mco hsi|sys|off` (clock output on PA8 = D7),
`uptime`, `regs`.

## Wiring
Nothing to wire: the shell runs over the USB cable. Put a scope probe on D7 to see `mco`.

## Expected output
See [`expected-output.txt`](expected-output.txt) (what you see after typing `help` and `clock`).

## How this was verified
- ✅ Builds in CI; the ring buffer and the shell are unit-tested on the host.
- ❌ Not run on a NUCLEO-G474RE yet.
