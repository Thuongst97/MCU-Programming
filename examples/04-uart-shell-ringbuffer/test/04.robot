# SPDX-License-Identifier: MIT
# Example 04 in Renode: the shell answers commands typed into the simulated UART.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/04-uart-shell-ringbuffer/04-uart-shell-ringbuffer.elf

*** Test Cases ***
Help Lists The Commands
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 04: UART shell (type help)
    Write Line To Uart    help
    Wait For Line On Uart    Commands:
    Wait For Line On Uart    led - led on|off|toggle (PC13)
    Wait For Line On Uart    regs - dump RCC and FLASH registers

Clock Command Reports The Bus Clocks
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 04: UART shell (type help)
    Write Line To Uart    clock
    Wait For Line On Uart    SYSCLK/HCLK 72000000 Hz, PCLK1 36000000 Hz, PCLK2 72000000 Hz

Led Command Drives PC13
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 04: UART shell (type help)
    Assert LED State    false
    Write Line To Uart    led on
    Run Virtual Time    0.1
    Assert LED State    true
    Write Line To Uart    led off
    Run Virtual Time    0.1
    Assert LED State    false

Unknown Commands Are Reported
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    Example 04: UART shell (type help)
    Write Line To Uart    blink
    Wait For Line On Uart    unknown command: blink (try help)
