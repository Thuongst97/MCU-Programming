# SPDX-License-Identifier: MIT
# Example 08 in Renode: faults are decoded, the record survives the reset, and an unfed watchdog
# resets the chip. Renode's bus returns 0 for unmapped addresses (no bus fault), and the course's
# RCC model always reports "power-on" as the reset cause.
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/08-iwdg-hardfault/08-iwdg-hardfault.elf

*** Keywords ***
Boot And Press
    [Arguments]    ${key}
    Create Blue Pill    ${ELF}
    Wait For Line On Uart    w = stop feeding the watchdog, h = this help
    Write Char On Uart    ${key}

*** Test Cases ***
Divide By Zero Is Trapped, Logged And Reported After Reset
    Boot And Press    d
    Wait For Line On Uart    : DIVBYZERO FORCED
    Wait For Line On Uart    *** resetting
    Wait For Line On Uart    Example 08 boot
    Wait For Line On Uart    DIVBYZERO FORCED

Undefined Instruction
    Boot And Press    u
    Wait For Line On Uart    : UNDEFINSTR FORCED

Calling Through An Even Address Is An Invalid State
    Boot And Press    i
    Wait For Line On Uart    : INVSTATE FORCED

Unfed Watchdog Resets The Chip
    Boot And Press    w
    Wait For Line On Uart    not feeding the watchdog any more: reset in about 1 s
    Wait For Line On Uart    Example 08 boot, reset cause:    timeout=3
