# SPDX-License-Identifier: MIT
# Shared Robot Framework keywords for Renode tests of the Blue Pill examples.
# Each example test passes its ELF path; tools/run-renode-tests.py supplies ${BUILD_DIR}.
*** Settings ***
Resource          ${RENODEKEYWORDS}

*** Variables ***
${BUILD_DIR}      ${CURDIR}/../../../build/bluepill-debug
${PLATFORM}       ${CURDIR}/bluepill.repl

*** Keywords ***
Create Blue Pill
    [Arguments]    ${elf}    ${name}=bluepill
    Execute Command    using sysbus
    Execute Command    mach create "${name}"
    Execute Command    machine LoadPlatformDescription @${PLATFORM}
    Execute Command    sysbus LoadELF @${elf}
    Execute Command    cpu VectorTableOffset 0x08000000
    ${tester}=    Create Terminal Tester    sysbus.usart1    timeout=5    machine=${name}
    ${led}=    Create LED Tester    sysbus.gpioPortC.led    defaultTimeout=2    machine=${name}
    Set Test Variable    ${LED_${name}}    ${led}
    [Return]    ${tester}

Add Button
    [Arguments]    ${port}    ${pin}    ${name}=button
    Execute Command    machine LoadPlatformDescriptionFromString "${name}: Miscellaneous.Button @ gpioPort${port} ${pin} { invert: true; -> gpioPort${port}@${pin} }"

Run Virtual Time
    [Documentation]    Pause, advance virtual time by ${seconds}, stay paused (testers restart it).
    [Arguments]    ${seconds}
    Execute Command    pause
    Execute Command    emulation RunFor "${seconds}"
