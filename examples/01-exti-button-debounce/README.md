---
id: "01"
title: Button on EXTI with debouncing
modules: [gpio, interrupts]
peripherals: [GPIOA, AFIO, EXTI, NVIC, SysTick, USART1]
flavor: bare metal + host unit tests
pins: [PA0, PC13, PA9, PA10]
hw: [push button from PA0 to GND, USB-UART adapter]
sim: partial
tested_on: []
---
# 01 — Button on EXTI with debouncing

A push button between PA0 and GND (internal pull-up) triggers EXTI line 0 on the falling edge.
The interrupt only counts the edge and sets a flag; `main()` debounces with a 20 ms settle time
(`src/debounce.c`, unit-tested on the host) and toggles the PC13 LED on every confirmed press.

## Expected output
```
Example 01: press the button on PA0
press 1 (raw edges so far: 3)
press 2 (raw edges so far: 4)
```
The raw edge count depends on your button: cheap tactile switches often bounce several times.

## Simulation fidelity
- ✅ EXTI routing through AFIO, NVIC, the debounce logic, LED.
- ⚠️ Renode's button has no contact bounce, so raw edges equal presses there.
- ❌ Not tested on a Blue Pill yet.
