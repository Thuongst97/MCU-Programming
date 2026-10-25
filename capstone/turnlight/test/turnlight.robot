# SPDX-License-Identifier: MIT
# TurnLight acceptance tests (capstone, modules 24-26). Every test is a template with one row per
# stage: the bare-metal, FreeRTOS and AUTOSAR-style ECUs must show the same black-box behaviour.
# Renode checks logic, timing in virtual time and CAN frames; flash rate accuracy, PWM ramps,
# real lamp current and the watchdog margin are on the hardware checklist (docs/acceptance.md).
*** Settings ***
Suite Setup       Setup
Suite Teardown    Teardown
Test Teardown     Test Teardown
Resource          ${CURDIR}/../../../examples/common/renode/bluepill.robot

*** Variables ***
${TL}             ${BUILD_DIR}/capstone/turnlight
${STAGE1}         ${TL}/stage1-baremetal/tl-stage1-baremetal.elf
${STAGE2}         ${TL}/stage2-freertos/tl-stage2-freertos.elf
${STAGE3}         ${TL}/stage3-autosar/tl-stage3-autosar.elf
${CLUSTER}        ${TL}/cluster/tl-cluster.elf
${ADC_CH1}        0x40012704

*** Keywords ***
ECU Without Waiting
    [Arguments]    ${elf}    ${name}=ecu
    ${t}=    Create Blue Pill    ${elf}    ${name}
    Execute Command    machine LoadPlatformDescriptionFromString "btnL: Miscellaneous.Button @ gpioPortB 12 { invert: true; -> gpioPortB@12 }"
    Execute Command    machine LoadPlatformDescriptionFromString "btnR: Miscellaneous.Button @ gpioPortB 13 { invert: true; -> gpioPortB@13 }"
    Execute Command    machine LoadPlatformDescriptionFromString "btnH: Miscellaneous.Button @ gpioPortB 14 { invert: true; -> gpioPortB@14 }"
    [Return]    ${t}

ECU
    [Arguments]    ${elf}    ${name}=ecu
    ${t}=    ECU Without Waiting    ${elf}    ${name}
    Wait For Line On Uart    TurnLight stage    testerId=${t}
    [Return]    ${t}

Hold
    [Arguments]    ${button}    ${seconds}
    Execute Command    gpioPortB.${button} Press
    Run Virtual Time    ${seconds}
    Execute Command    gpioPortB.${button} Release

Boot Reports The Reset Cause
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    Create Blue Pill    ${elf}
    Wait For Line On Uart    reset cause: power-on    testerId=${t}

Left Stalk Flashes The Left Lamp Only
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    ECU    ${elf}
    Execute Command    gpioPortB.btnL Press
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Wait For Line On Uart    lamp L 0    testerId=${t}
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Should Not Be On Uart    lamp R 1    testerId=${t}    timeout=1

Hazard Overrides The Stalk
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    ECU    ${elf}
    Execute Command    gpioPortB.btnL Press
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Hold    btnH    0.1
    Wait For Line On Uart    tl: hazard on    testerId=${t}
    Wait For Line On Uart    lamp R 1    testerId=${t}
    Hold    btnH    0.1
    Wait For Line On Uart    tl: hazard off    testerId=${t}

A Tap Gives Exactly Three Flashes
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    ECU    ${elf}
    Hold    btnL    0.2
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Wait For Line On Uart    lamp L 1    testerId=${t}
    Wait For Line On Uart    lamp L 0    testerId=${t}
    Should Not Be On Uart    lamp L 1    testerId=${t}    timeout=2

A Lamp Without Current Is Reported
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    ECU    ${elf}
    Execute Command    sysbus WriteDoubleWord ${ADC_CH1} 100
    Execute Command    gpioPortB.btnR Press
    Wait For Line On Uart    dem: TL_E_LAMP_OUT_R failed    testerId=${t}
    Execute Command    sysbus WriteDoubleWord ${ADC_CH1} 3000
    Wait For Line On Uart    dem: TL_E_LAMP_OUT_R passed    testerId=${t}

The Cluster Shows The Lamps Over CAN
    [Arguments]    ${elf}
    Reset Emulation
    ${e}=    ECU Without Waiting    ${elf}
    ${c}=    Create Blue Pill    ${CLUSTER}    cluster
    Add Button    A    0    mute
    Execute Command    emulation CreateCANHub "canhub"
    Execute Command    mach set "ecu"
    Execute Command    connector Connect sysbus.can1 canhub
    Execute Command    mach set "cluster"
    Execute Command    connector Connect sysbus.can1 canhub
    Execute Command    mach set "ecu"
    Wait For Line On Uart    TurnLight stage    testerId=${e}
    Execute Command    gpioPortB.btnL Press
    Wait For Line On Uart    cluster: L 1 R 0    testerId=${c}
    Wait For Line On Uart    cluster: L 0 R 0    testerId=${c}
    Should Not Be On Uart    dem: TL_E_CLUSTER_LOST failed    testerId=${e}    timeout=1

A Missing Cluster Is Detected
    [Arguments]    ${elf}
    Reset Emulation
    ${t}=    ECU    ${elf}
    Wait For Line On Uart    dem: TL_E_CLUSTER_LOST failed    testerId=${t}    timeout=2
    Execute Command    gpioPortB.btnL Press
    Wait For Line On Uart    lamp L 1    testerId=${t}

*** Test Cases ***
TL-REQ-010 Reset Cause
    [Template]    Boot Reports The Reset Cause
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-001 Left Stalk
    [Template]    Left Stalk Flashes The Left Lamp Only
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-003 Hazard
    [Template]    Hazard Overrides The Stalk
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-004 Comfort Blink
    [Template]    A Tap Gives Exactly Three Flashes
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-005 Lamp Out
    [Template]    A Lamp Without Current Is Reported
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-006 CAN Status To Cluster
    [Template]    The Cluster Shows The Lamps Over CAN
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}

TL-REQ-007 Cluster Supervision
    [Template]    A Missing Cluster Is Detected
    ${STAGE1}
    ${STAGE2}
    ${STAGE3}
