---
id: "07"
title: SPI master and a W25Qxx NOR flash
modules: [spi]
peripherals: [SPI2, DMA1, DMAMUX1, GPIOB, LPUART1]
flavor: bare metal + host unit tests
pins: [PB12, PB13, PB14, PB15, PA2, PA3]
hw: [NUCLEO-G474RE, W25Q32 or W25Q64 SPI flash module]
tested_on: []
---
# 07 — SPI master and a W25Qxx NOR flash

SPI2 in master mode 0 at 5.3 MHz (PCLK1 / 32) with a GPIO chip select on PB12. SPI1 is avoided
on purpose: its usual SCK pin PA5 drives LD2, and its other SCK pin PB3 is the debugger's SWO
line. The G4's SPI has a FIFO, so the code sets 8-bit frames (`CR2.DS`) and `FRXTH`, and accesses
`DR` as a byte.

The flash driver reads the JEDEC ID (0x9F), erases a 4 KB sector (0x20), programs a 256-byte page
(0x02) and reads it back (0x03), polling the BUSY bit with a timeout after every erase and program.
The read is done twice: byte by byte, and with DMA1 channels 2 (RX) and 3 (TX), which DMAMUX
connects to SPI2's requests. JEDEC decoding and command framing are unit-tested on the host.

## Wiring
The pins are on the Morpho header (CN10 on most NUCLEO-64 boards; check the silkscreen):
module CS → PB12, CLK → PB13, DO → PB14 (MISO), DI → PB15 (MOSI), VCC → 3V3, GND → GND.
Some modules also expose /WP and /HOLD: tie them to 3V3 if they are not pulled up on the board.

## Expected output
See [`expected-output.txt`](expected-output.txt) (a W25Q32; a W25Q64 reports `EF 40 17` and 8192 KB).

## How this was verified
- ✅ Builds in CI; JEDEC decoding and command framing are unit-tested on the host.
- ✅ AF numbers (SPI2 on PB13–PB15 = AF5) checked against ST's pin data.
- ⚠️ DMAMUX request IDs (SPI2_RX = 12, SPI2_TX = 13) come from ST's HAL sources.
- ❌ Not run on a NUCLEO-G474RE yet.
