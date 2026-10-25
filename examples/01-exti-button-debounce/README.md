---
id: "01"
title: Button on EXTI with debouncing
modules: [gpio, interrupts]
peripherals: [GPIOC, SYSCFG, EXTI, NVIC, SysTick, LPUART1]
flavor: bare metal + host unit tests
pins: [PC13, PA5, PA2, PA3]
hw: [NUCLEO-G474RE]
tested_on: []
---
# 01 — Button on EXTI with debouncing

The blue USER button B1 (PC13) triggers EXTI line 13 on both edges. The interrupt only counts
the edge and sets a flag; `main()` debounces with a 20 ms settle time (`src/debounce.c`,
unit-tested on the host) and toggles LD2 on every confirmed press.

## Wiring
Nothing to wire: B1 and LD2 are on the board.

## Expected output
```
Example 01: press the blue USER button (B1)
press 1 (raw edges so far: 2)
press 2 (raw edges so far: 6)
```
One clean press is 2 edges (down and up); more means the contacts bounced.

## How this was verified
- ✅ Builds in CI; the debounce logic is unit-tested on the host (`test/`).
- ⚠️ B1's level when pressed is `BOARD_BTN_PRESSED` (1, from ST's BSP). If presses are counted
  on release, your board is the other way round: set it to 0.
- ❌ Not run on a NUCLEO-G474RE yet.
