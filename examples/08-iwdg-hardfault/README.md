---
id: "08"
title: Watchdog, reset causes and a HardFault handler that tells you why
modules: [power-wdg, faults-debug]
peripherals: [IWDG, RCC, SCB, DBGMCU, LPUART1]
flavor: bare metal + host unit tests
pins: [PA2, PA3, PA5]
hw: [NUCLEO-G474RE]
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
| `b` | a read from `0x10008000`, the reserved space just past CCM SRAM | `PRECISERR BFARVALID FORCED` expected |
| `w` | stop feeding the watchdog | reset after about 1 s, cause "independent watchdog" |

The HardFault handler finds the exception frame on the right stack, stores CFSR, HFSR, MMFAR,
BFAR, PC and LR in a `.noinit` section that survives the reset, prints the decoded flags and
resets. Decoding is unit-tested on the host, including the Cortex-M4F's two lazy FPU stacking
errors (`MLSPERR`, `LSPERR`).

## Expected output
See [`expected-output.txt`](expected-output.txt) (after pressing `d`).

## How this was verified
- ✅ Builds in CI; fault and reset-cause decoding are unit-tested on the host.
- ⚠️ The `b` key's BusFault depends on the bus matrix answering a reserved address with an error;
  confirm on hardware.
- ❌ Not run on a NUCLEO-G474RE yet. The LSI (about 32 kHz) varies between chips, so the
  timeout is "about 1 s".
