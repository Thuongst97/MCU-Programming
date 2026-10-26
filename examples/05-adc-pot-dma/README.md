---
id: "05"
title: ADC on a potentiometer, then scan mode with circular DMA
modules: [adc-dma]
peripherals: [ADC1, DMA1, DMAMUX1, GPIOA, LPUART1]
flavor: bare metal + host unit tests
pins: [PA1, PA2, PA3]
hw: [NUCLEO-G474RE, 10 kΩ potentiometer (ends to 3V3 and GND, wiper to A1)]
tested_on: []
---
# 05 — ADC on a potentiometer, then scan mode with circular DMA

Part 1 brings ADC1 up the G4 way (leave deep power-down, start its regulator, calibrate, enable,
wait for ADRDY), then converts PA1 (the pot, Arduino A1) and the internal reference Vrefint
(channel 18) one at a time by polling. ST stores the factory Vrefint reading (taken at
VDDA = 3.0 V) in system memory; comparing today's reading with it gives the real VDDA
(`src/adcmath.c`, unit-tested on the host).

Part 2 switches to continuous scan: the ADC converts PA1 and Vrefint forever, DMAMUX routes the
ADC1 request to DMA1 channel 1, which writes every result into a circular buffer of 64
half-words, and `main()` only averages.

## Wiring
10 kΩ potentiometer: one end to 3V3, the other to GND, the wiper to A1 (PA1).

## Expected output
See [`expected-output.txt`](expected-output.txt) (pot at about mid position).

## How this was verified
- ✅ Builds in CI; the VDDA and millivolt maths are unit-tested on the host.
- ⚠️ The Vrefint channel (18), the DMAMUX request ID (5) and the calibration address come from
  ST's HAL/LL sources, not yet from RM0440 itself (docs/verification.md).
- ❌ Not run on a NUCLEO-G474RE yet.
