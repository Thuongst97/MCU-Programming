# SPDX-License-Identifier: MIT
# Example 01 in Renode: a press on PA0 reaches EXTI0 and toggles the LED. Renode's button has
# no contact bounce, so "raw edges" equals the press count here (on hardware it is usually higher).
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../common/renode/bluepill.robot

*** Variables ***
${ELF}            ${BUILD_DIR}/examples/01-exti-button-debounce/01-exti-button-debounce.elf

*** Test Cases ***
Press Is Counted And Toggles The LED
    Create Blue Pill    ${ELF}
    Add Button    A    0
    Wait For Line On Uart    Example 01: press the button on PA0
    Assert LED State    false
    Execute Command    gpioPortA.button Press
    Wait For Line On Uart    press 1 (raw edges so far: 1)
    Assert LED State    true
    Execute Command    gpioPortA.button Release
    Run Virtual Time    0.05
    Execute Command    gpioPortA.button PressAndRelease
    Execute Command    gpioPortA.button Press
    Wait For Line On Uart    press 2
    Assert LED State    false

A Glitch Shorter Than 20 ms Is Ignored
    Create Blue Pill    ${ELF}
    Add Button    A    0
    Wait For Line On Uart    Example 01: press the button on PA0
    Execute Command    gpioPortA.button PressAndRelease
    Run Virtual Time    0.1
    Should Not Be On Uart    press 1    timeout=0.2
    Assert LED State    false
