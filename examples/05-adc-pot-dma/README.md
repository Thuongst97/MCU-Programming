---
id: "05"
title: ADC on a potentiometer, then scan mode with circular DMA
modules: [adc-dma]
peripherals: [ADC1, DMA1, GPIOA, USART1]
flavor: bare metal + host unit tests
pins: [PA1, PA9, PA10]
hw: [10 kΩ potentiometer (ends to 3.3 V and GND, wiper to PA1), USB-UART adapter]
sim: partial
tested_on: []
---
# 05 — ADC on a potentiometer, then scan mode with circular DMA

Part 1 powers up and self-calibrates ADC1, then converts PA1 (the pot) and the internal reference
Vrefint (channel 17) one at a time by polling. Measuring Vrefint lets the code compute VDDA and
correct the pot reading for the real supply voltage (`src/adcmath.c`, unit-tested on the host).

Part 2 switches to scan + continuous mode: the ADC converts PA1 and Vrefint forever, DMA1
channel 1 writes every result into a circular buffer of 64 half-words, and `main()` only averages.

## Expected output
See [`expected-output.txt`](expected-output.txt) (pot at about mid position).

## Simulation fidelity (Renode, course ADC model)
- ✅ Power-up, calibration handshake, single conversions; the test sets the "analog" value.
- ⚠️ No noise, no sampling-time effects; Vrefint is a fixed value.
- ❌ DMA transfers from the ADC are not simulated: part 2 prints "no DMA transfers" in Renode.
- ❌ Not tested on a Blue Pill yet.
