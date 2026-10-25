---
id: "09"
title: Sleep and Stop modes, waking up on a button
modules: [power-wdg]
peripherals: [PWR, SCB, EXTI, AFIO, SysTick, USART1]
flavor: bare metal
pins: [PA0, PC13, PA9, PA10]
hw: [push button from PA0 to GND, USB-UART adapter, multimeter in the 3.3 V supply line (optional)]
sim: partial
tested_on: []
---
# 09 — Sleep and Stop modes, waking up on a button

Part 1 puts the CPU to sleep with `WFI` between SysTick interrupts (Sleep mode: only the CPU
clock stops) and counts the wake-ups in one second. Part 2 enters Stop mode (`SLEEPDEEP` +
`PWR_CR.LPDS`): every clock in the core domain stops until the button on PA0 raises EXTI line 0.
After Stop the chip runs on HSI, so the code rebuilds the 72 MHz clock tree before printing.

## Measuring the current
Power the board from a lab supply or the ST-Link's 3.3 V through a multimeter in series, with the
USB cable unplugged. The Blue Pill's power LED and regulator draw current too, so expect the board
to stay in the milliamp range even when the MCU itself is in Stop (DS5319 lists the chip alone).

## Expected output
See [`expected-output.txt`](expected-output.txt).

## Simulation fidelity (Renode)
- ✅ Control flow: WFI sleeps until an interrupt, Stop waits for the EXTI0 button, the clock is rebuilt.
- ❌ No power or current model; Renode's clocks do not really stop or fall back to HSI.
- ❌ Not tested on a Blue Pill yet.
