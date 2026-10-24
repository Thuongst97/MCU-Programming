---
id: "02"
title: SysTick time base and a cooperative scheduler
modules: [interrupts]
peripherals: [SysTick, GPIOC, USART1]
flavor: bare metal + host unit tests
pins: [PC13, PA9, PA10]
hw: [USB-UART adapter]
sim: full
tested_on: []
---
# 02 — SysTick time base and a cooperative scheduler

Three periodic tasks (10 ms, 100 ms, 1000 ms) in a table, run to completion by a tiny scheduler
(`src/scheduler.c`, unit-tested on the host: fixed rate, overrun detection, 32-bit wrap-around).

## Expected output
```
Example 02: cooperative scheduler, 3 tasks
t=1000 ms  sample=100 heartbeat=10 report=1 overruns=0
t=2000 ms  sample=200 heartbeat=20 report=2 overruns=0
```

## Simulation fidelity
- ✅ Everything this example shows (timing in virtual time, LED, UART).
- ❌ Not tested on a Blue Pill yet.
