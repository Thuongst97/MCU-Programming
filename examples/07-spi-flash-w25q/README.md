---
id: "07"
title: SPI master and a W25Qxx NOR flash
modules: [spi]
peripherals: [SPI1, DMA1, GPIOA, USART1]
flavor: bare metal + host unit tests
pins: [PA4, PA5, PA6, PA7, PA9, PA10]
hw: [W25Q32 or W25Q64 SPI flash module, USB-UART adapter]
sim: partial
tested_on: []
---
# 07 — SPI master and a W25Qxx NOR flash

SPI1 in master mode 0 at 4.5 MHz with a GPIO chip select on PA4. The flash driver reads the JEDEC
ID (0x9F), erases a 4 KB sector (0x20), programs a 256-byte page (0x02) and reads it back (0x03),
polling the BUSY bit with a timeout after every erase and program. The read is done twice: byte
by byte, and with DMA1 channels 2 (RX) and 3 (TX). JEDEC decoding and command framing are
unit-tested on the host.

## Wiring
Module CS → PA4, CLK → PA5, DO → PA6 (MISO), DI → PA7 (MOSI), VCC → 3.3, GND → G.
Some modules also expose /WP and /HOLD: tie them to 3.3 V if they are not pulled up on the board.

## Expected output
See [`expected-output.txt`](expected-output.txt) (a W25Q32; a W25Q64 reports `EF 40 17` and 8192 KB).

## Simulation fidelity (Renode)
- ✅ Command sequences, chip-select framing, erase/program/read and verify, using Renode's Micron MT25Q model (same basic commands, Micron JEDEC ID `20 BB 16`).
- ⚠️ The DMA read times out in simulation: Renode's SPI model drops received bytes when the TX DMA channel runs ahead. On hardware the RX channel has priority and keeps up.
- ❌ No SPI timing, no erase/program durations. Not tested on a Blue Pill yet.
