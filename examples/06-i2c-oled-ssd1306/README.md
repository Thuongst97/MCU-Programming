---
id: "06"
title: I2C master and an SSD1306 OLED
modules: [i2c]
peripherals: [I2C1, GPIOB, USART1]
flavor: bare metal + host unit tests
pins: [PB6, PB7, PA9, PA10]
hw: [SSD1306 128×64 I2C OLED module, USB-UART adapter]
sim: partial
tested_on: []
---
# 06 — I2C master and an SSD1306 OLED

A polling I2C master on I2C1 (PB6 = SCL, PB7 = SDA, 400 kHz) that follows the F1 event sequence
(START → SB, address → ADDR, data → TXE/BTF, STOP), reports a missing device as a NACK instead of
hanging, and recovers a stuck bus before initialising (see the I2C items in errata sheet ES096).
On top of it: an SSD1306 driver and a framebuffer with a 5×7 font drawn for this course
(`tools/gen-font.py` generates `src/font5x7.c`). The framebuffer code is unit-tested on the host.

## Wiring
OLED GND → G, VCC → 3.3, SCL → PB6, SDA → PB7. Most modules have 4.7–10 kΩ pull-ups on board;
check yours.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## Simulation fidelity (Renode)
- ✅ The I2C protocol path: probe, init and frame transfers to a generic acknowledging slave; NACK handling with no slave.
- ❌ No SSD1306 model, so **no pixels** are simulated; no bus timing, no pull-up rise times.
- ❌ Not tested on a Blue Pill yet.
