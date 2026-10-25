---
id: "10"
title: FreeRTOS basics: tasks, a queue, a mutex and an ISR semaphore
modules: [rtos]
peripherals: [SysTick, PendSV, SVCall, EXTI, LPUART1, GPIOA, GPIOC]
flavor: FreeRTOS (static allocation)
pins: [PC13, PA5, PA2, PA3]
hw: [NUCLEO-G474RE]
tested_on: []
---
# 10 — FreeRTOS basics

FreeRTOS-Kernel (vendored in `third_party/freertos_kernel`, Cortex-M4F port: it saves the FPU
registers of tasks that use floating point) with every object
allocated statically (`configSUPPORT_DYNAMIC_ALLOCATION = 0`, no heap file):

| Task | Priority | Does |
|---|---|---|
| `sensor` | 3 | every 10 ms (`vTaskDelayUntil`) puts a sample into a queue |
| `button` | 2 | waits on a binary semaphore given by the EXTI13 interrupt (B1, PC13) |
| `logger` | 1 | blocks on the queue, prints the mean of every 100 samples |
| `blink` | 1 | toggles LD2 (PA5) every 500 ms |
| `monitor` | 1 | every 2 s prints the stack high-water marks |

All printing goes through a mutex. Stack overflow is detected (`configCHECK_FOR_STACK_OVERFLOW = 2`)
and `configASSERT` reports the file and line.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## How this was verified
- ✅ Builds in CI against the vendored kernel.
- ❌ Not run on a NUCLEO-G474RE yet.
