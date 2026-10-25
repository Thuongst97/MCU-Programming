# SPDX-License-Identifier: MIT
# Example 10 in Renode: the scheduler runs (SysTick + PendSV), the queue carries 100 samples per
# second, the monitor reports stack high-water marks, and an EXTI interrupt wakes a task through a
# semaphore given from the ISR. Timing is in virtual time; CPU load is not meaningful in Renode.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/10-freertos-basics/10-freertos-basics.elf

*** Test Cases ***
Tasks, Queue And Mutex Work
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 10: FreeRTOS, 5 tasks, static allocation
    Wait For Line On Uart    logger: mean of 100 samples =
    Wait For Line On Uart    monitor: free stack words: sensor    timeout=3

Button Interrupt Wakes A Task Through A Semaphore
    Create Blue Pill    ${ELF}
    Add Button    A    0
    Wait For Line On Uart    logger: mean of 100 samples =
    Execute Command    gpioPortA.button PressAndRelease
    Wait For Line On Uart    button: press 1 (semaphore given from EXTI0 ISR)

LED Blinks At 1 Hz
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    logger: mean of 100 samples =
    Assert LED Is Blinking    testDuration=3    onDuration=0.5    offDuration=0.5    tolerance=0.05
