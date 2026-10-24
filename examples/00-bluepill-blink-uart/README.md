---
id: "00"
title: Blink, 72 MHz and "Hello from Blue Pill"
modules: [setup, boot, clocks, gpio, ll-drivers]
peripherals: [RCC, FLASH, GPIOC, GPIOA, USART1, SysTick]
flavor: bare metal (registers) + ST HAL + ST LL
pins: [PC13, PA9, PA10, PA13, PA14]
hw: [USB-UART adapter (3.3 V logic)]
sim: partial
tested_on: []
---
# 00 — Blink, 72 MHz and "Hello from Blue Pill"

The first program of the course, built three ways:

| Folder | What | Startup |
|---|---|---|
| `bare/` | registers through the CMSIS header — **the style the whole course uses** | C (`src/startup.c`), own linker script |
| `hal/` | the same program on ST's HAL, laid out the way STM32CubeMX generates it | ST's assembly startup |
| `ll/` | the same program on ST's LL (Appendix D) | course C startup |

What it does: blinks PC13 five times on the 8 MHz HSI with a busy-wait delay, switches to
HSE × PLL = 72 MHz and blinks five more times with the *same* delay (visibly faster on hardware),
then starts SysTick, prints a greeting on USART1 (PA9, 115200 8N1) and blinks at 1 Hz.

## Wiring
- ST-Link V2 → Blue Pill SWD header: 3.3V–3.3, SWDIO–DIO, SWCLK–CLK, GND–GND.
- USB-UART adapter (3.3 V logic): adapter RX ← PA9, adapter TX → PA10, GND–GND.
- Both BOOT jumpers on 0.

## Build, flash, simulate
```sh
cmake --preset bluepill-debug && cmake --build --preset bluepill-debug
cmake --build --preset bluepill-debug --target flash-00-bluepill-blink-uart
python3 tools/run-renode-tests.py examples/00-bluepill-blink-uart/bare/test/00.robot
```

## Expected output
See [`expected-output.txt`](expected-output.txt).

## Simulation fidelity (Renode, `examples/common/renode/bluepill.repl`)
- ✅ Clock-switch *logic* (HSERDY, PLLRDY, SWS), UART text, LED on/off, SysTick 1 ms timing.
- ⚠️ The speed-up after the switch to 72 MHz is **not** visible: Renode's CPU and SysTick do not follow RCC settings.
- ❌ Not tested on a Blue Pill yet (`tested_on` is empty).
