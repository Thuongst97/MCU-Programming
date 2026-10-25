---
id: "12"
title: A UART bootloader with CRC-checked updates
modules: [bootloader]
peripherals: [FLASH (FPEC), LPUART1, SysTick, GPIOA, GPIOC, SCB, NVIC]
flavor: bare-metal (CMSIS registers)
pins: [PC13, PA5, PA2, PA3]
hw: [NUCLEO-G474RE]
tested_on: []
---
# 12 — UART bootloader

Two images from one folder:

| Image | Address | Size | Linker script |
|---|---|---|---|
| `12-bootloader` | `0x08000000` | 12 KB code + 4 KB image record at `0x08003000` | `ld/bootloader.ld` |
| `12-application` | `0x08004000` | up to 240 KB (the rest of flash bank 1) | `ld/application.ld` |

The G474's flash page size depends on the `DBANK` option bit (2 KB in dual-bank mode, 4 KB in
single-bank mode), so the layout sits on 4 KB boundaries and `flash.c` asks `FLASH_OPTR` which
mode is active before erasing. Programming is in 64-bit double words.

At reset the bootloader stays in update mode (fast LED blink) when the USER button B1 is held,
when the slot holds no valid image, or when a HELLO frame arrives within 500 ms. Otherwise it
checks the image record (magic, size, CRC-32 of the whole image, a sanity check on the vector
table) and jumps: interrupts off, SysTick off, NVIC cleared, peripherals reset,
`SCB->VTOR` = `0x08004000`, MSP from the app's word 0, then the app's reset vector.

The protocol (`src/proto.h`, host side `host/blproto.py`): `0xA5, cmd, len (u16), payload, crc32`;
every frame is answered with ACK `0x79` or NACK `0x1F`. Update sequence: HELLO, ERASE (record
first, then the application slot), WRITE × n (256 bytes each, padded to whole double words),
DONE (size + CRC-32 of the whole image; the bootloader recomputes it from flash and only then
writes the record), RUN.

```sh
cmake --build --preset nucleo-debug
cmake --build --preset nucleo-debug --target flash-12-bootloader         # once, over SWD
python3 examples/12-uart-bootloader/host/upload.py --port /dev/ttyACM0 \
        build/nucleo-debug/examples/12-uart-bootloader/12-application.bin   # press reset first
```
`upload.py` needs `pyserial`; the NUCLEO's virtual COM port is the bootloader's UART (LPUART1).

## Expected output
See [`expected-output.txt`](expected-output.txt). The `y` characters are the ACK bytes.

## How this was verified
- ✅ Builds in CI; the frame parser and CRC-32 are unit-tested on the host (`test/`).
- ⚠️ The flash unlock keys and the DBANK page sizes come from ST's HAL sources and RM0440 as
  summarised there.
- ❌ Not run on a NUCLEO-G474RE yet.
