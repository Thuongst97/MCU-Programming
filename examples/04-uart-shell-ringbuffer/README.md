---
id: "04"
title: Interrupt-driven UART with ring buffers and a command shell
modules: [uart, interrupts]
peripherals: [USART1, NVIC, GPIOC]
flavor: bare metal + host unit tests
pins: [PA9, PA10, PC13]
hw: [USB-UART adapter]
sim: full
tested_on: []
---
# 04 — Interrupt-driven UART with ring buffers and a command shell

USART1 receives and transmits from its interrupt handler. Two single-producer single-consumer
ring buffers (`src/ringbuf.c`) decouple the ISR from `main()`, which sleeps with `WFI` until a byte
arrives and feeds it to a small shell (`src/shell.c`). Both are unit-tested on the host.

Commands: `help`, `led on|off|toggle`, `clock`, `uptime`, `regs`.

## Expected output
See [`expected-output.txt`](expected-output.txt) (what you see after typing `help` and `clock`).

## Simulation fidelity (Renode)
- ✅ Interrupt-driven RX/TX, the shell, the LED, register values reported by `regs` (from the course's RCC model).
- ⚠️ Line timing: Renode delivers characters without real bit times, so overruns cannot happen in simulation.
- ❌ Not tested on a Blue Pill yet.
