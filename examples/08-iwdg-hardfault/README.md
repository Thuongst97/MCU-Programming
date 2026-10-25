---
id: "08"
title: Watchdog, reset causes and a HardFault handler that tells you why
modules: [power-wdg, faults-debug]
peripherals: [IWDG, RCC, SCB, DBGMCU, USART1]
flavor: bare metal + host unit tests
pins: [PA9, PA10, PC13]
hw: [USB-UART adapter]
sim: partial
tested_on: []
---
# 08 — Watchdog, reset causes and a HardFault handler that tells you why

At boot the program prints why the chip was reset (`RCC_CSR`) and, if the previous run crashed,
the fault it recorded. It then starts the independent watchdog with a 1 s timeout and feeds it in
the main loop. Keys in the terminal cause faults on purpose:

| Key | What happens | Expected decode |
|---|---|---|
| `d` | divide by zero with `SCB->CCR.DIV_0_TRP` set | `DIVBYZERO FORCED` |
| `u` | the permanently undefined instruction `UDF #0` | `UNDEFINSTR FORCED` |
| `i` | a call through a function pointer with the Thumb bit cleared | `INVSTATE FORCED` |
| `b` | a read from `0x60000000`, where the C8 has no memory | `PRECISERR BFARVALID FORCED` on hardware |
| `w` | stop feeding the watchdog | reset after about 1 s, cause "independent watchdog" |

The HardFault handler finds the exception frame on the right stack, stores CFSR, HFSR, MMFAR,
BFAR, PC and LR in a `.noinit` section that survives the reset, prints the decoded flags and
resets. Decoding is unit-tested on the host.

## Expected output
See [`expected-output.txt`](expected-output.txt) (after pressing `d`).

## Simulation fidelity (Renode)
- ✅ UsageFaults (divide by zero, undefined instruction, invalid state), the stacked PC, the `.noinit` record across the reset, the watchdog reset.
- ⚠️ No BusFault: Renode returns 0 for reads of unmapped addresses (`b` prints "returned without a fault").
- ⚠️ The reset cause always reads "power-on": the course's RCC model does not track why the machine was reset.
- ❌ LSI frequency variation (30–60 kHz) is not modelled. Not tested on a Blue Pill yet.
