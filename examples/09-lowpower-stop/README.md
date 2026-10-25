---
id: "09"
title: Sleep and Stop modes, waking up on a button
modules: [power-wdg]
peripherals: [PWR, SCB, EXTI, SYSCFG, SysTick, LPUART1]
flavor: bare metal
pins: [PC13, PA5, PA2, PA3]
hw: [NUCLEO-G474RE, multimeter (optional)]
tested_on: []
---
# 09 — Sleep and Stop modes, waking up on a button

Part 1 puts the CPU to sleep with `WFI` between SysTick interrupts (Sleep mode: only the CPU
clock stops) and counts the wake-ups in one second. Part 2 enters Stop 1 mode (`SLEEPDEEP` +
`PWR_CR1.LPMS = Stop 1`): every clock in the core domain stops until the blue USER button B1
(PC13) raises EXTI line 13. After Stop the chip runs on HSI16, so the code rebuilds the 170 MHz
clock tree before printing.

## Measuring the current
NUCLEO-64 boards have a jumper for measuring the MCU's current alone (UM2505 describes it; check
the silkscreen on yours): replace it with an ammeter. Debug builds keep the debugger attached in
Stop (`DBGMCU_CR`), which keeps clocks running; measure a release build with the debugger
disconnected.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## How this was verified
- ✅ Builds in CI.
- ❌ Not run on a NUCLEO-G474RE yet; no current measured.
