---
id: "03"
title: PWM dimming on TIM3 and input capture on TIM2
modules: [timers]
peripherals: [TIM3, TIM2, GPIOA, LPUART1]
flavor: bare metal + host unit tests
pins: [PA6, PA0, PA2, PA3]
hw: [NUCLEO-G474RE, LED + 330 Ω resistor, jumper wire D12–A0]
tested_on: []
---
# 03 — PWM dimming on TIM3 and input capture on TIM2

TIM3 channel 1 drives PA6 (Arduino D12) with a 1 kHz PWM signal whose duty "breathes" (a squared
triangle, `src/breath.c`, unit-tested on the host). TIM2 in PWM-input mode measures that signal
on PA0 (Arduino A0): connect D12 to A0 with a jumper wire.

Timer clock: at the course setup APB1 runs at 170 MHz with prescaler 1, so TIM2/TIM3 count at
170 MHz (the ×2 rule only applies when the APB prescaler is not 1). PSC = 169 gives 1 MHz counts,
ARR = 999 gives 1 kHz. TIM2 is a 32-bit timer on the G4.

## Wiring
- D12 (PA6) → 330 Ω → LED anode, LED cathode → GND.
- Jumper D12 (PA6) → A0 (PA0) for the capture.

## Expected output
See [`expected-output.txt`](expected-output.txt) (with the D12–A0 jumper fitted).

## How this was verified
- ✅ Builds in CI; the breathing curve is unit-tested on the host.
- ✅ AF numbers (TIM3_CH1 on PA6 = AF2, TIM2_CH1 on PA0 = AF1) checked against ST's pin data.
- ❌ Not run on a NUCLEO-G474RE yet.
