# SPDX-License-Identifier: MIT
# Example 09 in Renode: Sleep mode wakes on every SysTick; Stop mode waits for the button and the
# clock tree is rebuilt afterwards. Renode models the control flow only: no current consumption,
# and its clock does not really fall back to HSI in Stop.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/09-lowpower-stop/09-lowpower-stop.elf

*** Test Cases ***
Sleep Wakes On Every Tick
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    sleep mode: 1000 wake-ups in 1 s (one per SysTick interrupt)

Button Wakes The Chip From Stop
    Create Blue Pill    ${ELF}
    Add Button    A    0
    Wait For Line On Uart    stop mode: press the button on PA0 to wake up
    Run Virtual Time    0.5
    Should Not Be On Uart    wake 1    timeout=0.2
    Execute Command    gpioPortA.button PressAndRelease
    Wait For Line On Uart    wake 1: back at 72 MHz
    Wait For Line On Uart    stop mode: press the button on PA0 to wake up
    # give the firmware its 5 ms to reach WFI: a press before that is consumed while still awake
    Run Virtual Time    0.1
    Execute Command    gpioPortA.button PressAndRelease
    Wait For Line On Uart    wake 2: back at 72 MHz
