# SPDX-License-Identifier: MIT
# Example 00 in Renode: clock switch succeeds (needs the RCC model in bluepill.repl), the greeting
# and uptime lines appear on USART1, and PC13 blinks at 1 Hz once SysTick drives it.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/00-bluepill-blink-uart/bare/00-bluepill-blink-uart.elf
${ELF_HAL}        ${BUILD_DIR}/examples/00-bluepill-blink-uart/hal/00-bluepill-blink-uart-hal.elf
${ELF_LL}         ${BUILD_DIR}/examples/00-bluepill-blink-uart/ll/00-bluepill-blink-uart-ll.elf

*** Test Cases ***
Bare: Switches To 72 MHz And Greets
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Hello from Blue Pill @ 72 MHz
    Wait For Line On Uart    clock status: 0 (0 = OK)

Bare: Prints Uptime Every Second
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    uptime 1 s
    Wait For Line On Uart    uptime 2 s

Bare: Blinks PC13 At 1 Hz
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    uptime 1 s
    Assert LED Is Blinking    testDuration=3    onDuration=0.5    offDuration=0.5    tolerance=0.05

HAL: Same Greeting
    Create Blue Pill    ${ELF_HAL}
    Wait For Line On Uart    Hello from Blue Pill @ 72 MHz (HAL)
    Wait For Line On Uart    uptime 1 s

LL: Same Greeting
    Create Blue Pill    ${ELF_LL}
    Wait For Line On Uart    Hello from Blue Pill @ 72 MHz (LL)
    Wait For Line On Uart    clock status: 0
