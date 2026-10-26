---
id: "02"
title: SysTick time base and a cooperative scheduler
modules: [interrupts]
peripherals: [SysTick, GPIOA, LPUART1]
flavor: bare metal + host unit tests
pins: [PA5, PA2, PA3]
hw: [NUCLEO-G474RE]
tested_on: []
---
# 02 — SysTick time base and a cooperative scheduler

Three periodic tasks (10 ms, 100 ms, 1000 ms) in a table, run to completion by a tiny scheduler
(`src/scheduler.c`, unit-tested on the host: fixed rate, overrun detection, 32-bit wrap-around).

## Wiring
Nothing to wire: LD2 and the virtual COM port are on the board.

## Expected output
```
Example 02: cooperative scheduler, 3 tasks
t=1000 ms  sample=100 heartbeat=10 report=1 overruns=0
t=2000 ms  sample=200 heartbeat=20 report=2 overruns=0
```

## How this was verified
- ✅ Builds in CI; the scheduler is unit-tested on the host (fixed rate, overruns, wrap-around).
- ❌ Not run on a NUCLEO-G474RE yet.
