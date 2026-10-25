---
id: "12"
title: A UART bootloader with CRC-checked updates
modules: [bootloader]
peripherals: [FLASH (FPEC), USART1, SysTick, GPIOA, GPIOC, SCB, NVIC]
flavor: bare-metal (CMSIS registers)
pins: [PA0, PC13, PA9, PA10]
hw: [USB-UART adapter, push button from PA0 to GND (optional)]
sim: partial
tested_on: []
---
# 12 — UART bootloader

Two images from one folder:

| Image | Address | Size | Linker script |
|---|---|---|---|
| `12-bootloader` | `0x08000000` | 15 KB code + 1 KB image record at `0x08003C00` | `ld/bootloader.ld` |
| `12-application` | `0x08004000` | up to 48 KB | `ld/application.ld` |

At reset the bootloader stays in update mode (fast LED blink) when PA0 is held low, when the slot
holds no valid image, or when a HELLO frame arrives within 500 ms. Otherwise it checks the image
record (magic, size, CRC-32 of the whole image, a sanity check on the vector table) and jumps:
interrupts off, SysTick off, NVIC cleared, peripherals reset, `SCB->VTOR` = `0x08004000`, MSP from
the app's word 0, then the app's reset vector.

The protocol (`src/proto.h`, host side `host/blproto.py`): `0xA5, cmd, len (u16), payload, crc32`;
every frame is answered with ACK `0x79` or NACK `0x1F`. Update sequence: HELLO, ERASE (record
first, then 48 pages), WRITE × n (256 bytes each), DONE (size + CRC-32 of the whole image; the
bootloader recomputes it from flash and only then writes the record), RUN.

```sh
cmake --build --preset bluepill-debug
cmake --build build/bluepill-debug --target flash-12-bootloader          # once, over SWD
python3 examples/12-uart-bootloader/host/upload.py --port /dev/ttyUSB0 \
        build/bluepill-debug/examples/12-uart-bootloader/12-application.bin   # press reset first
```
`upload.py` needs `pyserial` for a real port; `--tcp host:port` talks to a Renode socket terminal.

## Expected output
See [`expected-output.txt`](expected-output.txt). The `y` characters are the ACK bytes.

## Simulation fidelity (Renode)
- ✅ Protocol, CRC checks, record validation, the jump with VTOR and MSP, reboot into the bootloader.
- ⚠️ Flash erase is not modelled (Renode's flash accepts every write and never reads back `0xFF`);
  erase and programming take no time; the flash interface never reports an error.
- ❌ Not tested on a Blue Pill yet.
