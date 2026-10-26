---
id: "06"
title: I2C master and an SSD1306 OLED
modules: [i2c]
peripherals: [I2C2, GPIOA, LPUART1]
flavor: bare metal + host unit tests
pins: [PA9, PA8, PA2, PA3]
hw: [NUCLEO-G474RE, SSD1306 128×64 I2C OLED module]
tested_on: []
---
# 06 — I2C master and an SSD1306 OLED

A polling I2C master on I2C2 (PA9 = SCL = Arduino D8, PA8 = SDA = D7, 400 kHz) written for the
G4's I2C peripheral: each transfer is described once in `CR2` (slave address, byte count,
AUTOEND), and the code feeds a byte whenever `TXIS` asks; transfers longer than 255 bytes use
`RELOAD`. `TIMINGR` is computed from the I2C-bus minimum times (`src/i2c_timing.c`, unit-tested),
not pasted from a tool. A missing device is reported as a NACK instead of hanging, and a stuck
bus is clocked free before initialising.

On top of it: an SSD1306 driver and a framebuffer with a 5×7 font drawn for this course
(`tools/gen-font.py` generates `src/font5x7.c`). The framebuffer code is unit-tested on the host.

## Wiring
OLED GND → GND, VCC → 3V3, SCL → D8 (PA9), SDA → D7 (PA8). Not D15/D14: PB8 is also BOOT0, and
the module's pull-up would start ST's bootloader at every reset. Most modules have 4.7–10 kΩ
pull-ups on board; check yours.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## How this was verified
- ✅ Builds in CI; the framebuffer and the TIMINGR calculation are unit-tested on the host.
- ✅ AF numbers (I2C2 on PA9/PA8 = AF4) checked against ST's pin data.
- ❌ Not run on a NUCLEO-G474RE yet.
