---
id: "00"
title: Blink, 170 MHz and "Hello from NUCLEO-G474RE"
modules: [setup, boot, clocks, gpio, ll-drivers]
peripherals: [RCC, PWR, FLASH, GPIOA, LPUART1, SysTick]
flavor: bare metal (registers) + ST HAL + ST LL
pins: [PA5, PA2, PA3, PA13, PA14]
hw: [NUCLEO-G474RE, USB cable]
tested_on: []
---
# 00 — Blink, 170 MHz and "Hello from NUCLEO-G474RE"

The first program of the course, built three ways:

| Folder | What | Startup |
|---|---|---|
| `bare/` | registers through the CMSIS header — **the style the whole course uses** | C (`src/startup.c`), own linker script |
| `hal/` | the same program on ST's HAL, laid out the way STM32CubeMX generates it | ST's assembly startup |
| `ll/` | the same program on ST's LL (Appendix D) | course C startup |

What it does: blinks LD2 (PA5) five times on the 16 MHz HSI16 with a busy-wait delay, switches
to the PLL at 170 MHz and blinks five more times with the *same* delay (visibly faster), then
starts SysTick, prints a greeting on LPUART1 (PA2/PA3, 115200 8N1) and blinks at 1 Hz.

## Wiring
Nothing to wire: one USB cable to the NUCLEO's ST-LINK USB connector gives power, SWD and the
virtual COM port (LPUART1). Leave the jumpers as delivered.

## Build and flash
```sh
cmake --preset nucleo-debug && cmake --build --preset nucleo-debug
cmake --build --preset nucleo-debug --target flash-00-nucleo-blink-uart
```
Open the virtual COM port at 115200 8N1 (`picocom -b 115200 /dev/ttyACM0` on Linux).

## Expected output
See [`expected-output.txt`](expected-output.txt).

## How this was verified
- ✅ All three variants build in CI with `-Wall -Wextra -Werror` (our code).
- ⚠️ No simulator: Renode has no STM32G4 model.
- ❌ Not run on a NUCLEO-G474RE yet (`tested_on` is empty).
