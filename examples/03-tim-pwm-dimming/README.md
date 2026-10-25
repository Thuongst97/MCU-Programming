---
id: "03"
title: PWM dimming on TIM3 and input capture on TIM2
modules: [timers]
peripherals: [TIM3, TIM2, GPIOA, USART1]
flavor: bare metal + host unit tests
pins: [PA6, PA0, PA9, PA10]
hw: [LED + 330 Ω resistor, jumper wire PA6–PA0, USB-UART adapter]
sim: partial
tested_on: []
---
# 03 — PWM dimming on TIM3 and input capture on TIM2

TIM3 channel 1 drives PA6 with a 1 kHz PWM signal whose duty "breathes" (a squared triangle,
`src/breath.c`, unit-tested on the host). TIM2 in PWM-input mode measures that signal on PA0:
connect PA6 to PA0 with a jumper wire.

Timer clock: APB1 runs at 36 MHz with prescaler 2, so TIM2/TIM3 are clocked at 2 × 36 = 72 MHz
(RM0008 §7.2). PSC = 71 gives 1 MHz counts, ARR = 999 gives 1 kHz.

## Wiring
- PA6 → 330 Ω → LED anode, LED cathode → GND.
- Jumper PA6 → PA0 for the capture.
- USB-UART on PA9/PA10 as in example 00.

## Expected output
See [`expected-output.txt`](expected-output.txt) (with the PA6–PA0 jumper fitted).

## Simulation fidelity (Renode)
- ✅ Timer registers, the duty sequence and the UART report.
- ⚠️ No PWM waveform on the pin and no capture edges: the capture line reads "no edges" in Renode.
- ❌ LED brightness is not simulated. Not tested on a Blue Pill yet.
