---
id: "10"
title: FreeRTOS basics: tasks, a queue, a mutex and an ISR semaphore
modules: [rtos]
peripherals: [SysTick, PendSV, SVCall, EXTI, USART1, GPIOC]
flavor: FreeRTOS (static allocation)
pins: [PA0, PC13, PA9, PA10]
hw: [push button from PA0 to GND (optional), USB-UART adapter]
sim: full
tested_on: []
---
# 10 — FreeRTOS basics

FreeRTOS-Kernel (vendored in `third_party/freertos_kernel`, Cortex-M3 port) with every object
allocated statically (`configSUPPORT_DYNAMIC_ALLOCATION = 0`, no heap file):

| Task | Priority | Does |
|---|---|---|
| `sensor` | 3 | every 10 ms (`vTaskDelayUntil`) puts a sample into a queue |
| `button` | 2 | waits on a binary semaphore given by the EXTI0 interrupt (PA0) |
| `logger` | 1 | blocks on the queue, prints the mean of every 100 samples |
| `blink` | 1 | toggles PC13 every 500 ms |
| `monitor` | 1 | every 2 s prints the stack high-water marks |

All printing goes through a mutex. Stack overflow is detected (`configCHECK_FOR_STACK_OVERFLOW = 2`)
and `configASSERT` reports the file and line.

## Expected output
See [`expected-output.txt`](expected-output.txt).

## Simulation fidelity (Renode)
- ✅ Scheduling, SysTick/PendSV context switches, queue, mutex, ISR → task semaphore, LED timing in virtual time.
- ⚠️ CPU load and real interrupt latency are not meaningful in simulation.
- ❌ Not tested on a Blue Pill yet.
